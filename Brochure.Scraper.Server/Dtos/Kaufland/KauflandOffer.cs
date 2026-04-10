namespace Brochure.Scraper.Server.Dtos.Kaufland;

public record class KauflandOffer(
    KauflandPrices Prices, 
    string DateFrom, 
    string DateTo, 
    string Title, 
    string Subtitle, 
    string DetailTitle, 
    string DetailDescription,
    string? FormattedPrice,
    decimal? Discount,
    string Unit,
    string? FormattedOldPrice,
    string? LoyaltyFormattedPrice,
    string? LoyaltyFormattedOldPrice,
    decimal? LoyaltyDiscount)
{
    public Product MapToProduct(string category)
    {
        KauflandFormatted formattedPrice = Prices.Alternative.Formatted;

        PriceInfo price = new(
            CurrentPriceBgn: formattedPrice.Standard ?? formattedPrice.Loyalty ?? string.Empty,
            OldPriceBgn: formattedPrice.Old ?? formattedPrice.LoyaltyOld ?? string.Empty,
            UnitPriceBgn: Unit,
            CurrentPriceEur: FormattedPrice ?? LoyaltyFormattedPrice ?? string.Empty,
            OldPriceEur: FormattedOldPrice ?? LoyaltyFormattedOldPrice ?? string.Empty,
            UnitPriceEur: Unit,
            Discount: (Discount ?? LoyaltyDiscount ?? 0).ToString()
        );

        return new(
            ParseDate(DateFrom),
            ParseDate(DateTo),
            Title,
            Subtitle,
            price,
            DetailTitle,
            DetailDescription,
            category,
            ScraperType.Kaufland.ToString()
        );
    }

    private static DateTime ParseDate(string? dateStr) =>
        DateTime.TryParseExact(dateStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime dt) ? dt : DateTime.MinValue;
}
