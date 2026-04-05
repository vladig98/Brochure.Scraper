namespace Brochure.Scraper.Server.Dtos.Lidl;

public record class LidlPrice(decimal OldPrice, decimal OldPriceSecond, decimal Price, decimal PriceSecond, LidlPackaging Packaging, LidlDiscount? Discount);
