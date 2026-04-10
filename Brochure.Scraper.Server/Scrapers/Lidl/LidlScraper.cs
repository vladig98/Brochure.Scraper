namespace Brochure.Scraper.Server.Scrapers.Lidl;

public class LidlScraper(ILogger<LidlScraper> logger) : IScraper
{
    private readonly string _brochurePageUrl = "https://www.lidl.bg/";
    private const string _categoryLinkSelector = "a.ACategoryOverviewSlider__Link";
    private const string _linkScriptExtractor = "els => els.map(a => a.pathname)";
    private const string _extractProductsScript = @"() => {
        try {
            const productsObj = useNuxtApp().$pinia.state.value.useProductStore.products;
            const cleanData = JSON.parse(JSON.stringify(productsObj));
            const flatList = Object.values(cleanData).flat();
        
            return JSON.stringify(flatList);
        } catch (e) {
            return 'Error: ' + e.message;
        }
    }";
    private const string _ensureNewProductsSpawnedScript = @"(oldOuterCount) => {
        const current = Object.values(useNuxtApp().$pinia.state.value.useProductStore.products).flat().length;
        return current > oldOuterCount;
    }";
    private const string _dataLoadScriptChecker = @"() => window.useNuxtApp && window.useNuxtApp().$pinia";
    private const string _cookieAcceptSelector = "#onetrust-accept-btn-handler";
    private const string _loadMoreSelector = "button.s-load-more__button";
    private const string _cookiesBannerSelector = ".onetrust-pc-dark-filter";
    private const string _currentProductsCountScript = @"() => Object.values(useNuxtApp().$pinia.state.value.useProductStore.products).flat().length";
    private const string _totalProductsCountScript = @"() => useNuxtApp().$pinia.state.value.useProductStore.numFound";
    private readonly BrowserTypeLaunchOptions _browserLaunchOptions = new() { Headless = true };
    private readonly PageWaitForFunctionOptions _pageWaitFunctionOptions = new() { Timeout = 5_000 };
    private readonly PageWaitForSelectorOptions _pageWaitSelectorOptionsCookies = new() { State = WaitForSelectorState.Hidden };
    private readonly JsonSerializerOptions _jsonSerializerOptions = new() { PropertyNameCaseInsensitive = true };

    public async Task<ICollection<Product>> FetchProductsAsync(CancellationToken cancellationToken = default)
    {
        using IPlaywright playwright = await Playwright.CreateAsync();
        await using IBrowser browser = await playwright.Chromium.LaunchAsync(_browserLaunchOptions);

        await using IBrowserContext context = await browser.NewContextAsync();
        IPage page = await context.NewPageAsync();

        List<Product> lidlProducts = [];

        try
        {
            await page.GotoAsync(_brochurePageUrl);
            string[] links = await page.Locator(_categoryLinkSelector).EvaluateAllAsync<string[]>(_linkScriptExtractor);

            foreach (string link in links)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    logger.LogWarning("Cancellation requested for Lidl Scrapper");
                    break;
                }

                string fullUrl = $"{_brochurePageUrl.TrimEnd('/')}/{link.TrimStart('/')}";

                await page.GotoAsync(fullUrl);
                await page.WaitForFunctionAsync(_dataLoadScriptChecker, null, _pageWaitFunctionOptions);
                await HandleCookieConsentAsync(page);
                await ScrollAndLoadAllProductsAsync(page);

                string jsonDataString = await page.EvaluateAsync<string>(_extractProductsScript);
                if (jsonDataString.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    logger.LogError("Failed to get a valid json for {Link}", link);
                    continue;
                }

                LidlProduct[] products = JsonSerializer.Deserialize<LidlProduct[]>(jsonDataString, _jsonSerializerOptions) ?? [];
                IEnumerable<Product> lidlOffers = products.Select(x => x.MapToProduct());

                lidlProducts.AddRange(lidlOffers);
            }

            List<Product> offers = [.. lidlProducts.Distinct()];
            if (logger.IsEnabled(LogLevel.Information))
            {
                logger.LogInformation("Lidl successfully scraped {Count} products", offers.Count);
            }

            return offers;
        }
        catch (Exception e)
        {
            logger.LogError(e, "Can't scrape Lidl");
        }

        return [];
    }

    private async Task ScrollAndLoadAllProductsAsync(IPage page)
    {
        if (!await page.Locator(_loadMoreSelector).IsVisibleAsync())
        {
            return;
        }

        int currentCount = await page.EvaluateAsync<int>(_currentProductsCountScript);
        int totalExpected = await page.EvaluateAsync<int>(_totalProductsCountScript);

        while (currentCount < totalExpected)
        {
            // In case it pops back up
            await HandleCookieConsentAsync(page);
            ILocator button = page.Locator(_loadMoreSelector);
            if (!await button.IsVisibleAsync())
            {
                logger.LogWarning("Button disappeared at {Count} items.", currentCount);
                break;
            }

            await button.ClickAsync();

            try
            {
                await page.WaitForFunctionAsync(_ensureNewProductsSpawnedScript, currentCount, _pageWaitFunctionOptions);
                currentCount = await page.EvaluateAsync<int>(_currentProductsCountScript);
            }
            catch (TimeoutException)
            {
                logger.LogError("Timeout: Button was clicked but no new data arrived in Pinia.");
                break;
            }
        }
    }

    private async Task HandleCookieConsentAsync(IPage page)
    {
        if (!await page.IsVisibleAsync(_cookieAcceptSelector))
        {
            return;
        }

        await page.ClickAsync(_cookieAcceptSelector);
        await page.WaitForSelectorAsync(_cookiesBannerSelector, _pageWaitSelectorOptionsCookies);
    }
}
