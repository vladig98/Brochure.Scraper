namespace Brochure.Scraper.Server.Dtos.Metro;

public record class MetroCategoryChild(Dictionary<string, MetroCategoryChild>? Children, string UrlCategoryPath, long Amounts);
