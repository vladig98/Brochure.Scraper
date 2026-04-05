namespace Brochure.Scraper.Server.Dtos.Fantastico;

public readonly record struct FantasticoText(string Text, int X, int Y, int Width, int Height)
{
    public int X2 => X + Width;
    public int Y2 => Y + Height;
}
