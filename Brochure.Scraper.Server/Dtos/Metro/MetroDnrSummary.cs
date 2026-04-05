namespace Brochure.Scraper.Server.Dtos.Metro;

public record class MetroDnrSummary(string Name, string Start, string End, Dictionary<string, MetroDnrLevel> Levels);
