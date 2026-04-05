namespace Brochure.Scraper.Server.Dtos.Metro;

public record class MetroProductBundle(
    string Description,
    string BundleSize,
    string BrandName,
    string LongDescription,
    string BundleVolume,
    string BundleDepth,
    string BundleHeight,
    string BundleWidth,
    string GrossWeight,
    string BundleDepthMeasureUnit,
    string BundleHeightMeasureUnit,
    string BundleWidthMeasureUnit,
    decimal? BasePriceFactor,
    decimal? BasePriceContent,
    string BasePriceContentMeasureUnit,
    string PackagingType,
    MetroProductContentData ContentData,
    Dictionary<string, MetroStore> Stores
);
