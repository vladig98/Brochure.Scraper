namespace Brochure.Scraper.Server.Services;

public class ProductsAggregator(
    [FromKeyedServices(ScraperType.Kaufland)] IScraper kauflandScraper,
    [FromKeyedServices(ScraperType.Lidl)] IScraper lidlScraper,
    [FromKeyedServices(ScraperType.Billa)] IScraper billaScraper,
    [FromKeyedServices(ScraperType.Metro)] IScraper metroScraper,
    [FromKeyedServices(ScraperType.Fantastico)] IScraper fantasticoScraper)
{
    private readonly List<Product> _products = [];
    private readonly Lock _lock = new();
    private readonly JsonSerializerOptions _options = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = false };

    public async Task AggregateAsync()
    {
        _products.Clear();
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

        string projectRoot = Directory.GetParent(AppDomain.CurrentDomain.BaseDirectory)?.Parent?.Parent?.Parent?.FullName ?? string.Empty;
        string outputPath = Path.Combine(projectRoot, "..", "brochure.scraper.client", "public", "products.json");

        GetProductsResponse response = new(_products);
        string json = JsonSerializer.Serialize(response, _options);
        await File.WriteAllTextAsync(outputPath, json);
        Environment.Exit(0);
    }

    public IEnumerable<Product> GetAllProducts() => _products.AsReadOnly();
}
