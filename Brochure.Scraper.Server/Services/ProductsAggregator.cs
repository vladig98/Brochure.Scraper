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
    }

    public IEnumerable<Product> GetAllProducts() => _products.AsReadOnly();
}
