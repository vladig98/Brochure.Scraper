namespace Brochure.Scraper.Server.Dtos.Metro;

public record class MetroPriceInfo(
    decimal? FinalPrice,
    decimal? ShelfPrice,
    decimal? BasePrice,
    decimal? ListNetPrice,
    decimal? ListGrossPrice,
    decimal? DeliveryPrice,
    decimal? Vat,
    decimal? NetPrice,
    string Currency,
    decimal? GrossPrice,
    decimal? GrossStrikeThrough,
    Dictionary<string, MetroDnrInfo> DnrInfo,
    MetroDnrSummary? SummaryDnrInfo,
    MetroFinalPriceInfo FinalPricesInfo,
    MetroPromotionInfo? AppliedPromotionInfo
)
{
    private const decimal _bgnRate = 1.95583M;

    public List<Product> MapToProduct(MetroProductBundle bundle)
    {
        List<Product> products = [];

        string startDate = AppliedPromotionInfo is not null
            ? AppliedPromotionInfo.StartTime
            : DnrInfo is { Count: > 0 }
                ? DnrInfo.First().Value.Start
                : string.Empty;

        string endDate = AppliedPromotionInfo is not null
            ? AppliedPromotionInfo.EndTime
            : DnrInfo is { Count: > 0 }
                ? DnrInfo.First().Value.End
                : string.Empty;

        bool isStartValid = DateTime.TryParseExact(startDate, "yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime start);
        bool isEndValid = DateTime.TryParseExact(endDate, "yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime end);

        if (!isStartValid)
        {
            start = DateTime.MinValue;
        }

        if (!isEndValid)
        {
            end = DateTime.MaxValue;
        }

        decimal current = GrossPrice ?? 0;
        decimal currentBgn = Math.Round(current * _bgnRate, 2);
        decimal oldPrice = GrossStrikeThrough ?? 0;
        decimal oldPriceBgn = Math.Round(oldPrice * _bgnRate, 2);

        string discount = SummaryDnrInfo is not null
            ? SummaryDnrInfo.Levels.First().Value.FinalSingleGrossPrice
            : oldPrice > 0
                ? $"{Math.Ceiling((oldPrice - current) / oldPrice * 100)}%"
                : "0%";

        if (SummaryDnrInfo?.Levels is { Count: > 0 })
        {
            string[] levelsKeys = [.. SummaryDnrInfo.Levels.Keys.OrderBy(x => x)];
            for (int i = 0; i < levelsKeys.Length; i++)
            {
                string levelKey = levelsKeys[i];
                string unitGroup = i < levelsKeys.Length - 1 ? $"{levelKey} - {levelsKeys[i + 1]}" : levelKey;

                MetroDnrLevel level = SummaryDnrInfo.Levels[levelKey];
                products.Add(new Product
                (
                    DateFrom: start,
                    DateTo: end,
                    Title: bundle.Description,
                    Subtitle: bundle.BrandName,
                    Prices: new
                    (
                        CurrentPriceBgn: (Math.Round(decimal.Parse(level.FinalSingleGrossPrice) * _bgnRate, 2)).ToString(),
                        OldPriceBgn: currentBgn.ToString(),
                        UnitPriceBgn: unitGroup,
                        CurrentPriceEur: level.FinalSingleGrossPrice.ToString(),
                        OldPriceEur: current.ToString(),
                        UnitPriceEur: unitGroup,
                        Discount: $"{level.Value}%"
                    ),
                    DetailTitle: $"{bundle.BundleVolume} x {bundle.BundleDepth}{bundle.BundleDepthMeasureUnit} x {bundle.BundleHeight}{bundle.BundleHeightMeasureUnit} x {bundle.BundleWidth}{bundle.BundleWidthMeasureUnit} {bundle.ContentData.NetPieceWeight?.Value} {bundle.ContentData.NetPieceWeight?.Uom}",
                    DetailDescription: bundle.LongDescription,
                    CategoryName: "Metro Product",
                    StoreName: ScraperType.Metro.ToString()
                ));
            }
        }
        else
        {
            products.Add(new Product
            (
                DateFrom: start,
                DateTo: end,
                Title: bundle.Description,
                Subtitle: bundle.BrandName,
                Prices: new
                (
                    CurrentPriceBgn: currentBgn.ToString(),
                    OldPriceBgn: oldPriceBgn.ToString(),
                    UnitPriceBgn: $"{bundle.ContentData.NetPieceWeight?.Value} {bundle.ContentData.NetPieceWeight?.Uom}",
                    CurrentPriceEur: current.ToString(),
                    OldPriceEur: oldPrice.ToString(),
                    UnitPriceEur: bundle.BundleSize.ToString(),
                    Discount: discount
                ),
                DetailTitle: $"{bundle.BundleVolume} x {bundle.BundleDepth}{bundle.BundleDepthMeasureUnit} x {bundle.BundleHeight}{bundle.BundleHeightMeasureUnit} x {bundle.BundleWidth}{bundle.BundleWidthMeasureUnit}",
                DetailDescription: bundle.LongDescription,
                CategoryName: "Metro Product",
                StoreName: ScraperType.Metro.ToString()
            ));
        }

        return products;
    }
}
