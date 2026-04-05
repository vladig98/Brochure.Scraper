namespace Brochure.Scraper.Server.Dtos.Metro;

public record class MetroProductResult(string BrandName, Dictionary<string, string> VariantSelector, Dictionary<string, MetroProductVariant> Variants);
