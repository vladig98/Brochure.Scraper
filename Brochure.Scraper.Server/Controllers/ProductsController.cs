namespace Brochure.Scraper.Server.Controllers;

[ApiController]
[Route("[controller]")]
public class ProductsController(ProductsAggregator productsAggregator) : ControllerBase
{
    [HttpGet]
    public IActionResult GetProducts()
    {
        IEnumerable<Product> products = productsAggregator.GetAllProducts();
        GetProductsResponse response = new(products);

        return Ok(response);
    }
}
