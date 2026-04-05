namespace Brochure.Scraper.Server.Dtos.Metro;

public record class MetroCategoryResponse(MatroCategoryTree CategoryTree, string[] ResultIds, int? NextPage);
