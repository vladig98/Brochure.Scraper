namespace Brochure.Scraper.Server.Scrapers.Kaufland;

public class KauflandScraper(ILogger<KauflandScraper> logger) : IScraper
{
    private readonly string _brochurePageUrl = "https://www.kaufland.bg/aktualni-predlozheniya/oferti.html?kloffer-category=0001_TopArticle";
    private const string _extractKauflandJsonScript = @"() => {
        try {
            const data = window.SSR || window.__KAUFLAND_STATE__;
        
            if (!data) {
                return 'Error: Data object not found on window';
            }

            return JSON.stringify(data);
        } catch (e) {
            return 'Error: ' + e.message;
        }
    }";
    private const string _kauflandDataRetrieverScript = "() => typeof window.SSR !== 'undefined' || typeof window.__KAUFLAND_STATE__ !== 'undefined'";
    private readonly BrowserTypeLaunchOptions _browserOptions = new() { Headless = true };
    private readonly PageWaitForFunctionOptions _pageWaitFunctionOptions = new() { Timeout = 5_000 };
    private readonly JsonSerializerOptions _jsonSerializerOptions = new() { PropertyNameCaseInsensitive = true };

    public async Task<ICollection<Product>> FetchProductsAsync(CancellationToken cancellationToken = default)
    {
        using IPlaywright playwright = await Playwright.CreateAsync();
        await using IBrowser browser = await playwright.Chromium.LaunchAsync(_browserOptions);

        await using IBrowserContext context = await browser.NewContextAsync();
        IPage page = await context.NewPageAsync();

        List<Product> offerList = [];

        try
        {
            await page.GotoAsync(_brochurePageUrl);
            await page.WaitForFunctionAsync(_kauflandDataRetrieverScript, null, _pageWaitFunctionOptions);

            string jsonResponse = await page.EvaluateAsync<string>(_extractKauflandJsonScript);

            if (jsonResponse.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
            {
                logger.LogError("Kaufland JS state extraction failed: {Error}", jsonResponse);
                return [];
            }

            Dictionary<string, KauflandProduct>? rootData = JsonSerializer.Deserialize<Dictionary<string, KauflandProduct>>(jsonResponse, _jsonSerializerOptions);
            KauflandProduct? kauflandData = rootData?.Values.FirstOrDefault();

            if (kauflandData?.Props?.OfferData?.Cycles is not { Length: > 0 })
            {
                logger.LogWarning("Kaufland data structure was empty or unexpected.");
                return [];
            }

            List<Product> offers = [.. kauflandData.Props.OfferData.Cycles
                .SelectMany(cycle => cycle.Categories)
                .SelectMany(category => category.Offers.Select(offer => offer.MapToProduct(category.Name)))
                .Distinct()];

            if (logger.IsEnabled(LogLevel.Information))
            {
                logger.LogInformation("Kaufland successfully scraped {Count} products", offers.Count);
            }

            return offers;
        }
        catch (Exception e)
        {
            logger.LogError(e, "Can't scrape Kaufland");
        }

        return [];
    }
}