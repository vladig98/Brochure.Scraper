namespace Brochure.Scraper.Server.Scrapers;

public interface IScraper
{
    Task<ICollection<Product>> FetchProductsAsync(CancellationToken cancellationToken = default);
}
