namespace Brochure.Scraper.Server.Services;

public class ProductsAggregator(
    [FromKeyedServices(ScraperType.Kaufland)] IScraper kauflandScraper,
    [FromKeyedServices(ScraperType.Lidl)] IScraper lidlScraper,
    [FromKeyedServices(ScraperType.Billa)] IScraper billaScraper,
    [FromKeyedServices(ScraperType.Metro)] IScraper metroScraper,
    [FromKeyedServices(ScraperType.Fantastico)] IScraper fantasticoScraper,
    FueloScraper fueloScraper)
{
    private readonly List<Product> _products = [];
    private readonly Lock _lock = new();
    private readonly JsonSerializerOptions _options = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = false };

    public async Task AggregateAsync()
    {
        _products.Clear();
        string projectRoot = Directory.GetParent(AppDomain.CurrentDomain.BaseDirectory)?.Parent?.Parent?.Parent?.FullName ?? string.Empty;

        FuelPricesDto? fuelPrices = await fueloScraper.ScrapeAsync();
        if (fuelPrices.HasValue)
        {
            string path = Path.Combine(projectRoot, "..", "brochure.scraper.client", "public", "fuel_prices.json");
            await File.WriteAllTextAsync(path, JsonSerializer.Serialize(fuelPrices));
        }

        List<Task<ICollection<Product>>> tasks =
        [
            kauflandScraper.FetchProductsAsync(),
            lidlScraper.FetchProductsAsync(),
            billaScraper.FetchProductsAsync(),
            metroScraper.FetchProductsAsync(),
            fantasticoScraper.FetchProductsAsync()
        ];

        await foreach (Task<ICollection<Product>> finishedTask in Task.WhenEach(tasks))
        {
            ICollection<Product> products = await finishedTask;

            using (_lock.EnterScope())
            {
                _products.AddRange(products);
            }
        }

        string outputPath = Path.Combine(projectRoot, "..", "brochure.scraper.client", "public", "products.json");

        GetProductsResponse response = new(_products);
        string json = JsonSerializer.Serialize(response, _options);
        await File.WriteAllTextAsync(outputPath, json);

        //string brokenOutputPath = Path.Combine(projectRoot, "..", "brochure.scraper.client", "public", "broken.json");
        //string brokenJson = JsonSerializer.Serialize(_products.Where(x => string.IsNullOrWhiteSpace(x.Prices.CurrentPriceEur) || string.IsNullOrWhiteSpace(x.Prices.CurrentPriceBgn)), _options);
        //await File.WriteAllTextAsync(brokenOutputPath, brokenJson);

        Environment.Exit(0);
    }

    public IEnumerable<Product> GetAllProducts() => _products.AsReadOnly();
}
