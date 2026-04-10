namespace Brochure.Scraper.Server.Scrapers.Fantastico;

public class FantasticoScraper(ILogger<FantasticoScraper> logger) : IScraper
{
    private const string _brochureUrl = "https://www.fantastico.bg/special-offers";
    private const string _brochureDateSelector = ".brochure-description";
    private const string _brochureUrlSelector = "data-url";
    private const string _allBrochuresSelectors = ".brochure-switch";
    private const string _ocrTextUrl = "/flash/search/search";
    private const string _ocrTextBoxPlacementUrl = "/common/textblocks/page";
    private const string _nextPageButtonContainerSelector = ".next-button:not(.only-note)";
    private const string _nextPageButtonSelector = "button[data-nav-name='go-right']";
    private const string _styleSelector = "style";
    private const string _hiddenSelector = "display: none";
    private const string _rightArrowSelector = "ArrowRight";
    private const string _bgnCurrencySign = "лв";
    private const string _dateFormat = "dd.MM.yyyy";
    private const string _priceTagExplanationBrochure = "легенда";
    private const int _timeout = 2_000;
    private const int _loopFailSafe = 1_000;
    private const int _boxXIndex = 0;
    private const int _boxYIndex = 1;
    private const int _boxWidthIndex = 2;
    private const int _boxHeightIndex = 3;
    private const int _textTextIndex = 0;
    private const int _textXIndex = 1;
    private const int _textYIndex = 2;
    private const int _textWidthIndex = 4;
    private const int _textHeightIndex = 5;
    private const int _bottomBannerPosition = 800;
    private const char _percentSign = '%';
    private const char _minusSign = '-';
    private const char _euroSign = '\u20AC';
    private const char _whiteSpace = ' ';
    private const decimal _percent = 100.0M;
    private const decimal _bgnRate = 1.95583M;
    private const decimal _priceConversionRoundingError = 0.01M;
    private const decimal _discountRoundingError = 0.50M;
    private readonly string[] _newLineCharacters = ["\r", "\n", "\r\n"];
    private readonly string[] _xmlDelimiterCharacters = ["\u0002", "\u0003", "\u0004"];
    private readonly BrowserTypeLaunchOptions _browserLaunchOptions = new() { Headless = true };
    private readonly LocatorInnerTextOptions _textLocatorOptions = new() { Timeout = 5_000 };
    private readonly LocatorGetAttributeOptions _attributeLocatorOptions = new() { Timeout = 5_000 };
    private readonly PageGotoOptions _pageGoToOptions = new() { Timeout = 300_000 };
    private readonly PageWaitForLoadStateOptions _pageLoadOptions = new() { Timeout = 5_000 };
    private readonly PageWaitForResponseOptions _pageResponseOptions = new() { Timeout = 5_000 };

    public async Task<ICollection<Product>> FetchProductsAsync(CancellationToken cancellationToken = default)
    {
        using IPlaywright playwright = await Playwright.CreateAsync();
        await using IBrowser browser = await playwright.Chromium.LaunchAsync(_browserLaunchOptions);

        await using IBrowserContext context = await browser.NewContextAsync(options: null);
        IPage page = await context.NewPageAsync();

        await page.GotoAsync(_brochureUrl, _pageGoToOptions);

        IReadOnlyList<ILocator> brochureElements = await page.Locator(_allBrochuresSelectors).AllAsync();
        List<(string Url, string RawDate)> brochureDataList = [];

        foreach (var element in brochureElements)
        {
            string? url = await element.GetAttributeAsync(_brochureUrlSelector, _attributeLocatorOptions);
            string? dateText = await element.Locator(_brochureDateSelector, options: null).InnerTextAsync(_textLocatorOptions);

            if (!string.IsNullOrEmpty(url) && !string.IsNullOrEmpty(dateText))
            {
                brochureDataList.Add((url, dateText));
            }
        }

        ConcurrentDictionary<int, string> layoutJsons = [];
        ConcurrentDictionary<int, string> hexDump = [];

        AttachPageListenerEvent(page, layoutJsons, hexDump);
        List<Product> allProducts = [];

        foreach ((string url, string rawDate) in brochureDataList)
        {
            if (rawDate.Contains(_priceTagExplanationBrochure, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            layoutJsons.Clear();
            hexDump.Clear();

            (DateTime validFrom, DateTime validTo) = ExtractBrochureDates(rawDate);

            await page.GotoAsync(url, _pageGoToOptions);
            await page.WaitForLoadStateAsync(LoadState.DOMContentLoaded, _pageLoadOptions);
            await page.WaitForTimeoutAsync(_timeout);

            ILocator nextButtonContainer = page.Locator(_nextPageButtonContainerSelector, options: null);
            ILocator nextButton = nextButtonContainer.Locator(_nextPageButtonSelector, options: null);

            await FlipAllPagesAndScrapeAsync(page, nextButtonContainer);
            await page.WaitForTimeoutAsync(_timeout);

            Dictionary<int, List<FantasticoTextBox>> boxesPerPage = [];
            Dictionary<int, List<FantasticoText>> textsPerPage = [];

            int[] pageNumbers = [.. layoutJsons.Keys];
            FantasticoBounds boxBounds = new(1f, 1f);
            FantasticoBounds textBounds = new(1f, 1f);

            foreach (int pageNumber in pageNumbers)
            {
                string pageLayout = layoutJsons[pageNumber];
                boxesPerPage.Add(pageNumber, []);

                boxBounds = RecreateBoxesPerPage(boxesPerPage, pageNumber, pageLayout);

                string hexPerPage = hexDump[pageNumber];
                textsPerPage.Add(pageNumber, []);

                textBounds = RecreateTextElementsPerPage(textsPerPage, pageNumber, hexPerPage);
            }

            StringBuilder sb = new();
            foreach (int pageNumber in pageNumbers)
            {
                List<FantasticoTextBox> boxesOnCurrentPage = boxesPerPage[pageNumber];
                List<FantasticoText> textOnCurrentPage = textsPerPage[pageNumber];

                boxesOnCurrentPage = MergeBoxes(boxesOnCurrentPage, 7f);

                PutTextIntoBoxes(boxBounds, textBounds, boxesOnCurrentPage, textOnCurrentPage);
                MapProducts(allProducts, validFrom, validTo, sb, boxesOnCurrentPage);

                boxesOnCurrentPage = MergeBoxes(boxesOnCurrentPage, 25f);
                MapProducts(allProducts, validFrom, validTo, sb, boxesOnCurrentPage);
            }
        }

        List<Product> offers = [.. allProducts.Distinct()];
        if (logger.IsEnabled(LogLevel.Information))
        {
            logger.LogInformation("Fantastico successfully scraped {Count} products", offers.Count);
        }

        return offers;
    }

    private static void PutTextIntoBoxes(FantasticoBounds boxBounds, FantasticoBounds textBounds, List<FantasticoTextBox> boxesOnCurrentPage, List<FantasticoText> textOnCurrentPage)
    {
        for (int i = 0; i < boxesOnCurrentPage.Count; i++)
        {
            FantasticoTextBox box = boxesOnCurrentPage[i];
            for (int j = textOnCurrentPage.Count - 1; j >= 0; j--)
            {
                FantasticoText text = textOnCurrentPage[j];
                if (box.Contains(text, boxBounds, textBounds))
                {
                    box.Texts.Add(text);
                    textOnCurrentPage.RemoveAt(j);
                }
            }
        }
    }

    private static void MapProducts(List<Product> allProducts, DateTime validFrom, DateTime validTo, StringBuilder sb, List<FantasticoTextBox> boxesOnCurrentPage)
    {
        for (int i = boxesOnCurrentPage.Count - 1; i >= 0; i--)
        {
            if (boxesOnCurrentPage[i].Texts.Count == 0)
            {
                continue;
            }

            List<FantasticoText> orderedText = [.. boxesOnCurrentPage[i].Texts.OrderBy(t => t.Y).ThenBy(t => t.X)];
            List<decimal> pricesAndDiscounts = [];

            decimal discount = GetPricesAndDiscounts(orderedText, pricesAndDiscounts);
            PriceInfo priceInfo = GetPriceInfo(pricesAndDiscounts, discount);

            // Skip accidental scans of non-products 
            if (string.IsNullOrWhiteSpace(priceInfo.CurrentPriceEur))
            {
                continue;
            }

            string productName = GetProductName(sb, orderedText, priceInfo);
            if (string.IsNullOrWhiteSpace(productName))
            {
                continue;
            }

            Product product = new(validFrom, validTo, productName, string.Empty, priceInfo, string.Empty, string.Empty, string.Empty, ScraperType.Fantastico.ToString());
            allProducts.Add(product);

            boxesOnCurrentPage.RemoveAt(i);
        }
    }

    private (DateTime validFrom, DateTime validTo) ExtractBrochureDates(string rawDateText)
    {
        MatchCollection matches = FantasticoRegex.DatesRegex.Matches(rawDateText);

        if (matches.Count >= 2)
        {
            bool isFromValid = DateTime.TryParseExact(matches[0].Value, _dateFormat, null, DateTimeStyles.None, out DateTime from);
            bool isToValid = DateTime.TryParseExact(matches[1].Value, _dateFormat, null, DateTimeStyles.None, out DateTime to);

            if (isFromValid && isToValid)
            {
                return (from, to);
            }
        }

        // Fallback logic if parsing fails
        logger.LogWarning("Failed to parse dates from string: {Text}", rawDateText);

        return (DateTime.Now, DateTime.Now.AddDays(7));
    }

    private static string GetProductName(StringBuilder sb, List<FantasticoText> orderedText, PriceInfo priceInfo)
    {
        sb.Clear();
        foreach (FantasticoText text in orderedText)
        {
            if (text.Text.Contains(_percentSign))
            {
                continue;
            }

            if (text.Text.Contains(_euroSign))
            {
                continue;
            }

            if (text.Text.Contains(priceInfo.CurrentPriceEur) && !string.IsNullOrWhiteSpace(priceInfo.CurrentPriceEur))
            {
                continue;
            }

            if (text.Text.Contains(priceInfo.OldPriceEur) && !string.IsNullOrWhiteSpace(priceInfo.OldPriceEur))
            {
                continue;
            }

            if (text.Text.Contains(priceInfo.CurrentPriceBgn) && !string.IsNullOrWhiteSpace(priceInfo.CurrentPriceBgn))
            {
                continue;
            }

            if (text.Text.Contains(_bgnCurrencySign, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            sb.Append(_whiteSpace);
            sb.Append(text.Text);
        }

        return sb.ToString();
    }

    private static PriceInfo GetPriceInfo(List<decimal> pricesAndDiscounts, decimal discount)
    {
        PriceInfo priceInfo = new();

        for (int j = pricesAndDiscounts.Count - 1; j >= 0; j--)
        {
            decimal price = pricesAndDiscounts[j];

            for (int k = pricesAndDiscounts.Count - 1; k >= 0; k--)
            {
                if (j == k)
                {
                    continue;
                }

                decimal nextPrice = pricesAndDiscounts[k];

                if (Math.Abs(price * _bgnRate - nextPrice) <= _priceConversionRoundingError)
                {
                    priceInfo = priceInfo with { CurrentPriceEur = price.ToString(), CurrentPriceBgn = nextPrice.ToString() };
                }

                if (Math.Abs(price * discount - nextPrice) <= _discountRoundingError)
                {
                    decimal bgnPrice = Math.Round(price * _bgnRate, 2);
                    priceInfo = priceInfo with { OldPriceEur = price.ToString(), OldPriceBgn = bgnPrice.ToString() };
                }
            }
        }

        // If a product is not discounted
        if (string.IsNullOrWhiteSpace(priceInfo.OldPriceEur))
        {
            priceInfo = priceInfo with { OldPriceEur = string.Empty, OldPriceBgn = string.Empty };
        }

        return priceInfo;
    }

    private static decimal GetPricesAndDiscounts(List<FantasticoText> orderedText, List<decimal> pricesAndDiscounts)
    {
        decimal discount = 0M;

        foreach (FantasticoText text in orderedText)
        {
            if (text.Text.Contains(_percentSign) && text.Text.Contains(_minusSign) && text.Text.Length > 1)
            {
                Match match = FantasticoRegex.DigitRegex.Match(text.Text);
                discount = _percent - decimal.Parse(match.Value);
                discount /= _percent;

                continue;
            }

            MatchCollection numberMatches = FantasticoRegex.PriceRegex.Matches(text.Text);
            foreach (Match match in numberMatches)
            {
                pricesAndDiscounts.Add(decimal.Parse(match.Value));
            }
        }

        return discount;
    }

    private FantasticoBounds RecreateTextElementsPerPage(Dictionary<int, List<FantasticoText>> textsPerPage, int pageNumber, string hexPerPage)
    {
        float textMaxX = 1;
        float textMaxY = 1;

        string[] pageDumps = hexPerPage.Split(_newLineCharacters, StringSplitOptions.RemoveEmptyEntries);
        foreach (string pageDump in pageDumps)
        {
            string[] dumpText = pageDump.Split(_xmlDelimiterCharacters, StringSplitOptions.RemoveEmptyEntries);

            // Skip page indexing
            if (dumpText.Length == 1)
            {
                continue;
            }

            string textValue = dumpText[_textTextIndex];
            int textX = int.Parse(dumpText[_textXIndex]);
            int textY = int.Parse(dumpText[_textYIndex]);
            int textWidth = int.Parse(dumpText[_textWidthIndex]);
            int textHeight = int.Parse(dumpText[_textHeightIndex]);

            FantasticoText text = new(textValue, textX, textY, textWidth, textHeight);
            textsPerPage[pageNumber].Add(text);

            int maxX = Math.Max(textX, text.X2);
            textMaxX = Math.Max(textMaxX, maxX);

            int maxY = Math.Max(textY, text.Y2);
            textMaxY = Math.Max(textMaxY, maxY);
        }

        return new FantasticoBounds(textMaxX, textMaxY);
    }

    private FantasticoBounds RecreateBoxesPerPage(Dictionary<int, List<FantasticoTextBox>> boxesPerPage, int pageNumber, string pageLayout)
    {
        float boxMaxX = 1f;
        float boxMaxY = 1f;

        string[] boxesJson = pageLayout.Split(_newLineCharacters, StringSplitOptions.RemoveEmptyEntries);
        foreach (string boxJson in boxesJson)
        {
            string[] dimensions = boxJson.Split(_xmlDelimiterCharacters, StringSplitOptions.RemoveEmptyEntries);

            // Skip page indexing
            if (dimensions.Length == 1)
            {
                continue;
            }

            int boxX = int.Parse(dimensions[_boxXIndex]);
            int boxY = int.Parse(dimensions[_boxYIndex]);
            int boxWidth = int.Parse(dimensions[_boxWidthIndex]);
            int boxHeight = int.Parse(dimensions[_boxHeightIndex]);

            FantasticoTextBox box = new(boxX, boxY, boxWidth, boxHeight, []);
            boxesPerPage[pageNumber].Add(box);

            int maxX = Math.Max(boxX, box.X2);
            boxMaxX = Math.Max(boxMaxX, maxX);

            int maxY = Math.Max(boxY, box.Y2);
            boxMaxY = Math.Max(boxMaxY, maxY);
        }

        return new FantasticoBounds(boxMaxX, boxMaxY);
    }

    private async Task FlipAllPagesAndScrapeAsync(IPage page, ILocator nextButtonContainer)
    {
        int currentCount = 0;

        while (true)
        {
            if (currentCount >= _loopFailSafe)
            {
                break;
            }

            string? style = await nextButtonContainer.GetAttributeAsync(_styleSelector, _attributeLocatorOptions);
            if (!string.IsNullOrWhiteSpace(style) && style.Contains(_hiddenSelector))
            {
                break;
            }

            Task<IResponse> responseTask = page.WaitForResponseAsync(r => r.Url.Contains(_ocrTextUrl, StringComparison.OrdinalIgnoreCase) && r.Status == (int)HttpStatusCode.OK, _pageResponseOptions);
            Task<IResponse> layoutTask = page.WaitForResponseAsync(r => r.Url.Contains(_ocrTextBoxPlacementUrl, StringComparison.OrdinalIgnoreCase) && r.Status == (int)HttpStatusCode.OK, _pageResponseOptions);

            await page.Keyboard.PressAsync(_rightArrowSelector);

            try
            {
                await Task.WhenAll(responseTask, layoutTask);
                await page.WaitForTimeoutAsync(_timeout);
            }
            catch (TimeoutException)
            {
                logger.LogDebug("No new search data on this flip.");
            }

            currentCount++;
        }
    }

    private void AttachPageListenerEvent(IPage page, ConcurrentDictionary<int, string> layout, ConcurrentDictionary<int, string> hex)
    {
        page.Response += async (_, response) =>
        {
            if (response.Status != (int)HttpStatusCode.OK)
            {
                return;
            }

            string url = response.Url;
            bool isLayout = url.Contains(_ocrTextBoxPlacementUrl, StringComparison.OrdinalIgnoreCase);
            bool isOcr = url.Contains(_ocrTextUrl, StringComparison.OrdinalIgnoreCase);

            if (!isLayout && !isOcr)
            {
                return;
            }

            try
            {
                Match match = FantasticoRegex.PageRegex.Match(url);

                int pageNumber = int.Parse(match.Value);
                string rawData = await response.TextAsync();

                if (isLayout)
                {
                    layout.TryAdd(pageNumber, rawData);
                }
                else if (isOcr)
                {
                    hex.TryAdd(pageNumber, rawData);
                }
            }
            catch (Exception ex)
            {
                logger.LogError("Failed to capture response body: {Message}", ex.Message);
            }
        };
    }

    private static List<FantasticoTextBox> MergeBoxes(List<FantasticoTextBox> boxes, float offset)
    {
        HashSet<FantasticoTextBox> visited = [];
        List<FantasticoTextBox> result = [];

        for (int i = 0; i < boxes.Count; i++)
        {
            if (visited.Contains(boxes[i]))
            {
                continue;
            }

            List<FantasticoTextBox> group = [];
            Stack<FantasticoTextBox> stack = new();

            stack.Push(boxes[i]);
            while (stack.Count > 0)
            {
                FantasticoTextBox current = stack.Pop();

                if (visited.Contains(current))
                {
                    continue;
                }

                // We must ignore advertisment text like links
                if (current.Y > _bottomBannerPosition)
                {
                    continue;
                }

                visited.Add(current);
                group.Add(current);

                foreach (FantasticoTextBox other in boxes)
                {
                    if (other.Y > _bottomBannerPosition)
                    {
                        continue;
                    }

                    if (!visited.Contains(other) && AreClose(current, other, offset))
                    {
                        stack.Push(other);
                    }
                }
            }

            if (group.Count == 0)
            {
                continue;
            }

            FantasticoTextBox merged = MergeGroup(group);
            foreach (FantasticoTextBox textBox in group)
            {
                merged.Texts.AddRange(textBox.Texts);
            }

            result.Add(merged);
        }

        return result;
    }

    private static FantasticoTextBox MergeGroup(List<FantasticoTextBox> boxes)
    {
        int minX = int.MaxValue;
        int minY = int.MaxValue;
        int maxX = int.MinValue;
        int maxY = int.MinValue;

        foreach (FantasticoTextBox b in boxes)
        {
            int left = b.X;
            int right = b.X + b.Width;
            int top = b.Y;
            int bottom = b.Y + b.Height;

            minX = Math.Min(minX, left);
            minY = Math.Min(minY, top);
            maxX = Math.Max(maxX, right);
            maxY = Math.Max(maxY, bottom);
        }

        return new FantasticoTextBox(minX, minY, maxX - minX, maxY - minY, []);
    }

    private static bool AreClose(FantasticoTextBox a, FantasticoTextBox b, float offset = 5f)
    {
        float aLeft = a.X;
        float aRight = a.X + a.Width;
        float aTop = a.Y;
        float aBottom = a.Y + a.Height;

        float bLeft = b.X;
        float bRight = b.X + b.Width;
        float bTop = b.Y;
        float bBottom = b.Y + b.Height;

        return aLeft <= bRight + offset &&
               aRight >= bLeft - offset &&
               aTop <= bBottom + offset &&
               aBottom >= bTop - offset;
    }
}
