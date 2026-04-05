namespace Brochure.Scraper.Server.Dtos.Fantastico;

public readonly record struct FantasticoTextBox(int X, int Y, int Width, int Height, List<FantasticoText> Texts)
{
    public int X2 => X + Width;
    public int Y2 => Y + Height;

    public bool Contains(FantasticoText text, FantasticoBounds boxBounds, FantasticoBounds textBounds)
    {
        // Normalize Box coordinates to 0.0 - 1.0
        float boxLeft = X / boxBounds.MaxX;
        float boxRight = X2 / boxBounds.MaxX;
        float boxTop = Y / boxBounds.MaxY;
        float boxBottom = Y2 / boxBounds.MaxY;

        // Normalize Text center point to 0.0 - 1.0
        float textCenterX = ((text.X + text.X2) / 2f) / textBounds.MaxX;
        float textCenterY = ((text.Y + text.Y2) / 2f) / textBounds.MaxY;

        // Strict inclusion: No offsets, no padding
        return textCenterX >= boxLeft &&
               textCenterX <= boxRight &&
               textCenterY >= boxTop &&
               textCenterY <= boxBottom;
    }
};
