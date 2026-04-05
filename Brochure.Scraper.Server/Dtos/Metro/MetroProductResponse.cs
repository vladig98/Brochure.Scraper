namespace Brochure.Scraper.Server.Dtos.Metro;

public record class MetroProductResponse(Dictionary<string, MetroProductResult> Result, string? Json);
