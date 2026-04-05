namespace Brochure.Scraper.Server.Dtos.Metro;

public record class MetroFinalPriceInfo(
    decimal? SumNet,
    decimal? SumVatAmount,
    decimal? SumGross,
    decimal? ArticleNet,
    decimal? ArticleVatAmount,
    decimal? ArticleGross,
    decimal? ArticleWithTaxesNet,
    decimal? ArticleWithTaxesVatAmount,
    decimal? ArticleWithTaxesGross,
    decimal? EmptiesNet,
    decimal? EmptiesVatAmount,
    decimal? EmptiesGross,
    decimal? AvgPerUnitSumNet,
    decimal? AvgPerUnitSumGross,
    decimal? AvgPerUnitSumWithTaxesNet,
    decimal? AvgPerUnitSumWithTaxesGross,
    decimal? SingleSumNet,
    decimal? SingleSumGross,
    decimal? SingleSumWithTaxesNet,
    decimal? SingleSumWithTaxesGross,
    decimal? SingleItem,
    decimal? SingleItemGross,
    decimal? SingleItemWithoutEmpties
);
