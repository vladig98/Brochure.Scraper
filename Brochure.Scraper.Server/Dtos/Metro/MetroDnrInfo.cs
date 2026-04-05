namespace Brochure.Scraper.Server.Dtos.Metro;

public record class MetroDnrInfo(string Name, Dictionary<string, MetroDnrLevel> Levels, string Start, string End);
