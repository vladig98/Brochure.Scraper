namespace Brochure.Scraper.Server.Dtos.Lidl;

public record class LidlDiscount(decimal DeletedPrice, decimal DeletedPriceSecond, string DiscountText, decimal PercentageDiscount);
