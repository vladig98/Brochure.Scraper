namespace Brochure.Scraper.Server.Dtos.Metro;

public record class MatroCategoryTree(Dictionary<string, MetroCategoryChild> Children);
