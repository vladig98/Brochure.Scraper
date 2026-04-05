namespace Brochure.Scraper.Server.Dtos;

public record class GetProductsResponse(IEnumerable<Product> Products);
