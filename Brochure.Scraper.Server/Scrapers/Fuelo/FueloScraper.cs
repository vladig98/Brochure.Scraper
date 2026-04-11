namespace Brochure.Scraper.Server.Scrapers.Fuelo;

public class FueloScraper(ILogger<FueloScraper> logger)
{
    private const string _requestUrl = "https://bg.fuelo.net/prices";
    private const string _averagePriceSelector = "#pricesTable thead tr:has-text('Средна цена')";
    private const string _tableHeaderSelector = "th";
    private const int _a95Index = 1;
    private const int _dieselIndex = 2;
    private const int _lpgIndex = 3;
    private const int _methaneIndex = 4;
    private const int _dieselPlusIndex = 5;
    private const int _a98PlusIndex = 6;
    private const char _comma = ',';
    private const char _decimalPoint = '.';
    private readonly BrowserTypeLaunchOptions _browserLaunchOptions = new() { Headless = true };
    private readonly PageGotoOptions _pageGoToOptions = new() { Timeout = 300_000 };

    public async Task<FuelPricesDto?> ScrapeAsync()
    {
        using IPlaywright playwright = await Playwright.CreateAsync();
        await using IBrowser browser = await playwright.Chromium.LaunchAsync(_browserLaunchOptions);

        await using IBrowserContext context = await browser.NewContextAsync(options: null);
        IPage page = await context.NewPageAsync();

        try
        {
            await page.GotoAsync(_requestUrl, _pageGoToOptions);
            ILocator averageRow = page.Locator(_averagePriceSelector, options: null);
            ILocator tableHeader = averageRow.Locator(_tableHeaderSelector, options: null);

            Task<decimal> a95PriceTask = GetPriceFromCell(tableHeader.Nth(_a95Index));
            Task<decimal> dieselPriceTask = GetPriceFromCell(tableHeader.Nth(_dieselIndex));
            Task<decimal> lpgPriceTask = GetPriceFromCell(tableHeader.Nth(_lpgIndex));
            Task<decimal> methanePriceTask = GetPriceFromCell(tableHeader.Nth(_methaneIndex));
            Task<decimal> dieselPlusPriceTask = GetPriceFromCell(tableHeader.Nth(_dieselPlusIndex));
            Task<decimal> a98PlusPriceTask = GetPriceFromCell(tableHeader.Nth(_a98PlusIndex));

            await Task.WhenAll(a95PriceTask, dieselPriceTask, lpgPriceTask, methanePriceTask, dieselPlusPriceTask, a98PlusPriceTask);

            FuelPricesDto fuelPrices = new
            (
                A95: await a95PriceTask,
                Diesel: await dieselPriceTask,
                LPG: await lpgPriceTask,
                Methane: await methanePriceTask,
                DieselPlus: await dieselPlusPriceTask,
                A98Plus: await a98PlusPriceTask
            );

            return fuelPrices;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Playwright failed to scrape Fuelo prices.");
            return null;
        }
        finally
        {
            await page.CloseAsync();
        }
    }

    private static async Task<decimal> GetPriceFromCell(ILocator cell)
    {
        string fullText = await cell.InnerTextAsync();
        Match match = FueloRegex.PriceRegex.Match(fullText);

        if (match.Success)
        {
            string cleanValue = match.Value.Replace(_comma, _decimalPoint);
            return decimal.TryParse(cleanValue, CultureInfo.InvariantCulture, out decimal result) ? result : 0;
        }

        return 0;
    }
}