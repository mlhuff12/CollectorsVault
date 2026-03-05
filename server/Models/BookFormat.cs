namespace CollectorsVault.Server.Models
{
    /// <summary>
    /// Physical or digital format of a book.
    /// Values are derived from the Open Library <c>physical_format</c> field and common collector categories.
    /// </summary>
    public enum BookFormat
    {
        Unknown = 0,
        Hardcover = 1,
        Paperback = 2,
        MassMarketPaperback = 3,
        TradePaperback = 4,
        BoardBook = 5,
        LibraryBinding = 6,
        SpiralBound = 7,
        EBook = 8,
        Audiobook = 9,
        Other = 10
    }
}
