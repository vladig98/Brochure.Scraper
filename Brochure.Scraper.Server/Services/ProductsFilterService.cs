namespace Brochure.Scraper.Server.Services;

public class ProductsFilterService(
    [FromKeyedServices(ScraperType.Kaufland)] IScraper kauflandScraper,
    [FromKeyedServices(ScraperType.Lidl)] IScraper lidlScraper,
    [FromKeyedServices(ScraperType.Billa)] IScraper billaScraper,
    [FromKeyedServices(ScraperType.Metro)] IScraper metroScraper,
    [FromKeyedServices(ScraperType.Fantastico)] IScraper fantasticoScraper,
    IOptions<ScraperSettings> options)
{
    private readonly ScraperSettings _scraperSettings = options.Value;

    public async Task FilterAsync()
    {
        Task<ICollection<Product>> kauflandOffersTask = kauflandScraper.FetchProductsAsync();
        Task<ICollection<Product>> lidlOffersTask = lidlScraper.FetchProductsAsync();
        Task<ICollection<Product>> billaOffersTask = billaScraper.FetchProductsAsync();
        Task<ICollection<Product>> metroOffersTask = metroScraper.FetchProductsAsync();
        Task<ICollection<Product>> fantasticoOffersTask = fantasticoScraper.FetchProductsAsync();

        await Task.WhenAll(kauflandOffersTask, lidlOffersTask, billaOffersTask, metroOffersTask, fantasticoOffersTask);

        ICollection<Product> kauflandProducts = await kauflandOffersTask;
        ICollection<Product> lidlProducts = await lidlOffersTask;
        ICollection<Product> billaProducts = await billaOffersTask;
        ICollection<Product> metroProducts = await metroOffersTask;
        ICollection<Product> fantasticoProducts = await fantasticoOffersTask;

        Product[] allProducts = [.. kauflandProducts, .. lidlProducts, .. billaProducts, .. metroProducts, .. fantasticoProducts];
        string[] products = _scraperSettings.ScrapingItems;

        foreach (Product offer in allProducts)
        {
            foreach (string prodcut in products)
            {
                if ((offer.Title?.Contains(prodcut, StringComparison.CurrentCultureIgnoreCase) ?? false)
                    || (offer.DetailTitle?.Contains(prodcut, StringComparison.CurrentCultureIgnoreCase) ?? false)
                    || (offer.DetailDescription?.Contains(prodcut, StringComparison.CurrentCultureIgnoreCase) ?? false)
                    || (offer.Subtitle?.Contains(prodcut, StringComparison.CurrentCultureIgnoreCase) ?? false))
                {
                    Console.WriteLine($"{offer.Title} - {offer.Subtitle} - {offer.DetailTitle} - {offer.DetailDescription}");
                }
            }
        }
    }
}
