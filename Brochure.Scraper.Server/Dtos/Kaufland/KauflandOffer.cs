namespace Brochure.Scraper.Server.Dtos.Kaufland;

public record class KauflandOffer(KauflandPrices Prices, string DateFrom, string DateTo, string Title, string Subtitle, string DetailTitle, string DetailDescription)
{
    public Product MapToProduct(string category)
    {
        KauflandFormatted formattedPrice = Prices.Alternative.Formatted;

        PriceInfo price = new(
            formattedPrice.Standard,
            formattedPrice.Old,
            formattedPrice.Base,
            formattedPrice.FormattedPrice,
            formattedPrice.FormattedOldPrice,
            formattedPrice.FormattedBasePrice,
            formattedPrice.Discount
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
