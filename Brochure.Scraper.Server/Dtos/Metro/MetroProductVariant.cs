namespace Brochure.Scraper.Server.Dtos.Metro;

public record class MetroProductVariant(string Description, Dictionary<string, string> BundleSelector, Dictionary<string, MetroProductBundle> Bundles);
