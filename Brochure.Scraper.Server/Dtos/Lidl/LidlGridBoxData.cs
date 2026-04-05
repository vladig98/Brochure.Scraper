namespace Brochure.Scraper.Server.Dtos.Lidl;

public record class LidlGridBoxData(string Category, string FullTitle, LidlKeyfacts Keyfacts, LidlPrice Price, long StoreStartDate, long StoreEndDate, string Title, LidlPlus[] LidlPlus);
