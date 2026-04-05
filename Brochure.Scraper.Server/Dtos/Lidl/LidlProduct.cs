namespace Brochure.Scraper.Server.Dtos.Lidl;

public record class LidlProduct(LidlGridBox GridBox)
{
    public Product MapToProduct()
    {
        LidlGridBoxData gridBoxData = GridBox.GridBoxData;
        LidlPrice price = gridBoxData.LidlPlus is { Length: > 0 }
            ? gridBoxData.LidlPlus[0].Price
            : gridBoxData.Price;

        return new(
            DateTimeOffset.FromUnixTimeSeconds(gridBoxData.StoreStartDate).DateTime,
            DateTimeOffset.FromUnixTimeSeconds(gridBoxData.StoreEndDate).DateTime,
            gridBoxData.FullTitle,
            gridBoxData.Title,
            new PriceInfo(
                price.PriceSecond.ToString(),
                price.OldPriceSecond.ToString(),
                price.Packaging?.Text ?? string.Empty,
                price.Price.ToString(),
                price.OldPrice.ToString(),
                price.Packaging?.Text ?? string.Empty,
                price.Discount?.DiscountText ?? string.Empty
            ),
            gridBoxData.Keyfacts.FullTitle,
            gridBoxData.Keyfacts.Description,
            gridBoxData.Keyfacts.WonCategoryPrimary,
            ScraperType.Lidl.ToString()
        );
    }
}
