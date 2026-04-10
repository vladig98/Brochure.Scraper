namespace Brochure.Scraper.Server.Dtos.Billa;

public record class BillaProduct(
    string LocationCode,
    string StoreAddress,
    string ProductName,
    string ProductCode,
    string CategoryCode,
    decimal PriceEur,
    decimal DiscountedPriceEur,
    DateTime DiscountEndDate,
    string DiscountPercentage
)
{
    private const decimal _bgnRate = 1.95583M;

    public Product MapToProduct(DateTime from)
    {
        decimal currentPriceEur = DiscountedPriceEur > 0
            ? DiscountedPriceEur
            : PriceEur;
        decimal oldPriceEur = DiscountedPriceEur > 0
            ? PriceEur
            : 0;

        decimal currentPriceBgn = Math.Round(currentPriceEur * _bgnRate, 2);
        decimal oldPriceBgn = Math.Round(oldPriceEur * _bgnRate, 2);

        return new
        (
            DateFrom: from,
            DateTo: DiscountEndDate,
            Title: ProductName,
            Subtitle: string.Empty,
            Prices: new PriceInfo
            (
                CurrentPriceBgn: currentPriceBgn.ToString(),
                OldPriceBgn: oldPriceBgn.ToString(),
                UnitPriceBgn: string.Empty,
                CurrentPriceEur: currentPriceEur.ToString(),
                OldPriceEur: oldPriceEur.ToString(),
                UnitPriceEur: string.Empty,
                Discount: DiscountPercentage
            ),
            DetailTitle: string.Empty,
            DetailDescription: string.Empty,
            CategoryName: "Billa Product",
            StoreName: ScraperType.Billa.ToString()
        );
    }
}
