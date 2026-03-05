# Book Lookup API Research

This document summarizes research into free APIs that can look up book data by ISBN, title, or author name — evaluated for use in Collectors Vault.

---

## Summary Rankings

| Rank | API | Free | Key Required | ISBN | Title | Author |
|------|-----|------|--------------|------|-------|--------|
| 1 | [Open Library API](#1-open-library-api) | ✅ Fully free | ❌ No | ✅ | ✅ | ✅ |
| 2 | [Google Books API](#2-google-books-api) | ✅ Free tier | ⚠️ Optional (recommended) | ✅ | ✅ | ✅ |
| 3 | [ISBNdb API](#3-isbndb-api) | ⚠️ Very limited free tier | ✅ Yes | ✅ | ✅ | ✅ |

---

## 1. Open Library API

**Website:** https://openlibrary.org/developers/api  
**Overall Rating: ⭐⭐⭐⭐⭐ — Best pick for Collectors Vault**

### Overview

Open Library is a project of the Internet Archive. Its API is completely open with no authentication required. It exposes endpoints for books (by ISBN), full-text search (title, author, subject), author details, covers, and more. The data is community-contributed and can be edited via the Open Library website.

### Cost & Key

- **Free:** Yes, completely free — no paid tiers.
- **Key required:** No API key needed at all.

### Rate Limits

- No officially documented hard rate limit.
- The Internet Archive asks for "polite" usage (avoid flooding the service with hundreds of concurrent requests).
- Recommended: limit to ~1 request per second for bulk operations.

### Query Capabilities

| Capability | Supported | Notes |
|------------|-----------|-------|
| ISBN lookup | ✅ | Dedicated `/isbn/{isbn}.json` endpoint |
| Title search | ✅ | `/search.json?title=` |
| Author search | ✅ | `/search.json?author=` |
| Full-text / combined | ✅ | `/search.json?q=` |

### Example Requests

**By ISBN:**
```
GET https://openlibrary.org/isbn/9780547928227.json
```
Or with richer metadata using the Books API:
```
GET https://openlibrary.org/api/books?bibkeys=ISBN:9780547928227&format=json&jscmd=data
```

**By Title:**
```
GET https://openlibrary.org/search.json?title=The+Hobbit&limit=5
```

**By Author:**
```
GET https://openlibrary.org/search.json?author=Tolkien&limit=5
```

### Sample Response — Books API by ISBN

```json
{
  "ISBN:9780547928227": {
    "title": "The Hobbit",
    "subtitle": "Or, There and Back Again",
    "authors": [
      {
        "name": "J.R.R. Tolkien",
        "url": "https://openlibrary.org/authors/OL26320A/J.R.R._Tolkien"
      }
    ],
    "number_of_pages": 300,
    "publish_date": "2012",
    "publishers": [{ "name": "Houghton Mifflin Harcourt" }],
    "identifiers": {
      "isbn_13": ["9780547928227"],
      "isbn_10": ["0547928227"]
    },
    "cover": {
      "small": "https://covers.openlibrary.org/b/isbn/9780547928227-S.jpg",
      "medium": "https://covers.openlibrary.org/b/isbn/9780547928227-M.jpg",
      "large": "https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg"
    },
    "subjects": [
      { "name": "Fantasy fiction" },
      { "name": "Wizards" }
    ],
    "url": "https://openlibrary.org/books/OL25986154M/The_Hobbit"
  }
}
```

Full API reference and more sample responses: https://openlibrary.org/developers/api

### Extra / Neat Features

- **Cover images** at three sizes (S/M/L) addressable by ISBN alone — great for auto-filling artwork in the vault.
- **Author endpoint** (`/authors/{key}.json`) returns biography, birth/death dates, other works — could power an author detail view.
- **Works endpoint** (`/works/{key}.json`) groups all editions of a book together; useful for showing "other editions" of a title a user owns.
- **Subjects browser** (`/subjects/fantasy.json`) allows discovery browsing by genre/topic.
- **My Books / Reading Log** REST API — could integrate reading-progress features in the future.

### Pros

- ✅ Completely free with no key or account required.
- ✅ Direct, reliable ISBN-to-metadata endpoint.
- ✅ Cover image CDN included (no third-party needed).
- ✅ Rich metadata: publishers, page count, subjects, editions.
- ✅ Large dataset — millions of books across all languages.
- ✅ Open data — community can fix errors, so data improves over time.

### Cons

- ⚠️ Data quality is community-contributed, so some entries are incomplete or inconsistent (missing page counts, wrong categories).
- ⚠️ No official SLA; service availability depends on the Internet Archive's infrastructure.
- ⚠️ Bulk operations require self-imposed throttling to stay polite.
- ⚠️ Search relevance is not as refined as commercial engines (no fuzzy matching, no popularity ranking).

---

## 2. Google Books API

**Website:** https://developers.google.com/books  
**Overall Rating: ⭐⭐⭐⭐ — Best coverage, slight key/quota overhead**

### Overview

Google Books exposes bibliographic metadata for millions of titles indexed in Google's book scanning project. Supports ISBN, title, author, publisher, and subject queries. Returns thumbnails, preview links, description snippets, and Google's book-specific identifiers (volume ID).

### Cost & Key

- **Free:** Yes — the Volumes (read-only) API is free.
- **Key required:** No key needed for unauthenticated requests, but an API key from the [Google Cloud Console](https://console.cloud.google.com/) is **strongly recommended** to avoid hitting anonymous IP-based quotas and to use the Cloud Console quota dashboard.

### Rate Limits

- Without a key: **1,000 requests/day** shared across all anonymous requests from the same IP — can be exhausted quickly in shared hosting.
- With a free API key: **1,000 requests/100 seconds per user** with a default of **1,000,000 queries/day** (at no charge). In practice, the free tier is very generous for a personal app.
- Additional quota can be requested at no charge via the Cloud Console.

### Query Capabilities

| Capability | Supported | Notes |
|------------|-----------|-------|
| ISBN lookup | ✅ | `q=isbn:` filter |
| Title search | ✅ | `q=intitle:` filter |
| Author search | ✅ | `q=inauthor:` filter |
| Publisher search | ✅ | `q=inpublisher:` filter |
| Full-text / combined | ✅ | `q=` general query |

### Example Requests

**By ISBN:**
```
GET https://www.googleapis.com/books/v1/volumes?q=isbn:9780547928227&key=YOUR_API_KEY
```

**By Title:**
```
GET https://www.googleapis.com/books/v1/volumes?q=intitle:The+Hobbit&maxResults=5&key=YOUR_API_KEY
```

**By Author:**
```
GET https://www.googleapis.com/books/v1/volumes?q=inauthor:Tolkien&maxResults=5&key=YOUR_API_KEY
```

### Sample Response — By ISBN

```json
{
  "kind": "books#volumes",
  "totalItems": 1,
  "items": [
    {
      "id": "pD6arNyKyi8C",
      "volumeInfo": {
        "title": "The Hobbit",
        "authors": ["J.R.R. Tolkien"],
        "publisher": "Houghton Mifflin Harcourt",
        "publishedDate": "2012-09-18",
        "description": "Bilbo Baggins is a hobbit who enjoys a comfortable, unambitious life...",
        "industryIdentifiers": [
          { "type": "ISBN_13", "identifier": "9780547928227" },
          { "type": "ISBN_10", "identifier": "0547928227" }
        ],
        "pageCount": 300,
        "categories": ["Fiction"],
        "averageRating": 4.5,
        "ratingsCount": 12845,
        "imageLinks": {
          "smallThumbnail": "http://books.google.com/books/content?id=pD6arNyKyi8C&printsec=frontcover&img=1&zoom=5",
          "thumbnail": "http://books.google.com/books/content?id=pD6arNyKyi8C&printsec=frontcover&img=1&zoom=1"
        },
        "previewLink": "http://books.google.com/books?id=pD6arNyKyi8C&printsec=frontcover",
        "language": "en"
      }
    }
  ]
}
```

Full API reference and more sample responses: https://developers.google.com/books/docs/v1/reference

### Extra / Neat Features

- **`averageRating` and `ratingsCount`** pulled from Google user reviews — handy for showing how popular a book is.
- **`previewLink`** — direct link to Google Books preview; easy "Read a sample" button.
- **`description`** field contains full or partial book synopsis; no separate call needed.
- **Bookshelves API** — if users authenticate via OAuth, they can read/write Google Bookshelves (e.g., "Want to Read", "Reading", "Read") — possible future sync feature.
- **`categories` field** provides genre/subject tagging without a separate lookup.

### Pros

- ✅ Enormous dataset — Google has scanned millions of books; very high hit rate on ISBN lookups.
- ✅ Rich metadata in a single response: cover thumbnail, description, rating, preview link.
- ✅ Generous free quota with a free API key (suitable for a personal app indefinitely).
- ✅ Well-documented, stable REST API with official client libraries.
- ✅ Supports pagination and `maxResults` for search queries.

### Cons

- ⚠️ API key required for reliable use (anonymous quota is low at 1,000/day per IP).
- ⚠️ Getting an API key requires a Google Cloud Console account (though free to create and use).
- ⚠️ Some ISBNs return no results or return incorrect volumes if Google's data has gaps.
- ⚠️ Cover thumbnails are served via `http://` URLs (not HTTPS in some older entries) and require a `&edge=curl` param trick for direct HTTPS access.
- ⚠️ Data is read-only from the API perspective — no community corrections for bad metadata.

---

## 3. ISBNdb API

**Website:** https://isbndb.com  
**Overall Rating: ⭐⭐⭐ — Best data quality, but effectively paid**

### Overview

ISBNdb is a database built specifically around ISBN-centric book data. It aggregates records from libraries, publishers, and booksellers worldwide, resulting in very high-quality, consistent ISBN records. However, its free tier is extremely limited and most practical use requires a paid subscription.

### Cost & Key

- **Free:** ⚠️ Very limited — the free plan allows roughly 1 request/second with a daily hard cap that is not clearly published but in practice is very low (often cited as 10–20 calls/day).
- **Key required:** Yes — all requests require an API key in the `Authorization` header.
- **Paid plans:** Start at approximately $10/month for 1 request/second sustained, with higher tiers for bulk access.

### Rate Limits

- **Free tier:** ~1 request/second; very low daily request ceiling (not suitable for any real usage beyond proof-of-concept).
- **Basic paid plan:** 1 req/sec; unlimited daily requests.
- Limits enforced by an `X-RateLimit-*` header system.

### Query Capabilities

| Capability | Supported | Notes |
|------------|-----------|-------|
| ISBN lookup | ✅ | Dedicated `/books/{isbn}` endpoint |
| Title search | ✅ | `/search/books?column=title&value=` |
| Author search | ✅ | `/search/books?column=author&value=` |
| Full-text / combined | ✅ | `/search/books?column=text&value=` |

### Example Requests

**By ISBN:**
```
GET https://api2.isbndb.com/books/9780547928227
Authorization: YOUR_API_KEY
```

**By Title:**
```
GET https://api2.isbndb.com/search/books?column=title&value=The+Hobbit&page=1&pageSize=5
Authorization: YOUR_API_KEY
```

**By Author:**
```
GET https://api2.isbndb.com/search/books?column=author&value=Tolkien&page=1&pageSize=5
Authorization: YOUR_API_KEY
```

### Sample Response — By ISBN

```json
{
  "book": {
    "title": "The Hobbit",
    "title_long": "The Hobbit, or, There and Back Again",
    "isbn": "0547928227",
    "isbn13": "9780547928227",
    "authors": ["J.R.R. Tolkien"],
    "publisher": "Houghton Mifflin Harcourt",
    "date_published": "2012-09-18",
    "edition": "Reprint",
    "pages": 300,
    "overview": "Bilbo Baggins is a hobbit who enjoys a comfortable, unambitious life...",
    "synopsis": "...",
    "image": "https://images.isbndb.com/covers/82/27/9780547928227.jpg",
    "subjects": ["Fantasy fiction", "Wizards -- Fiction"],
    "language": "en"
  }
}
```

Full API reference: https://isbndb.com/apidocs/v2

### Extra / Neat Features

- **`title_long`** contains edition/subtitle information separate from the bare title — useful for disambiguation.
- **`edition` field** explicitly identifies print edition.
- **`synopsis` vs `overview`** — two separate description fields with varying detail levels.
- **/publishers** and **/authors** top-level endpoints allow browsing an author's complete works or a publisher's full catalog.

### Pros

- ✅ Highest ISBN data quality and completeness of the three APIs reviewed.
- ✅ Explicit `edition` field — helpful for collectors tracking specific printings.
- ✅ Covers hosted on a stable HTTPS CDN (`images.isbndb.com`).
- ✅ Straightforward REST design with consistent response shapes.

### Cons

- ❌ Effectively requires a paid subscription for any real-world use.
- ❌ Free tier is too restrictive for even light development testing.
- ⚠️ API key always required — extra setup step.
- ⚠️ Not open-source data; no community corrections.

---

## Recommendation for Collectors Vault

### Suggested Approach: Open Library first, Google Books as fallback

1. **Primary: Open Library API** — Use as the default lookup. No key needed, covers most ISBNs, and provides cover image URLs out of the box.
2. **Fallback: Google Books API** — Register a free API key in Google Cloud Console and fall back to it when Open Library returns no result. Adds description, rating, and preview link data.

This two-API strategy provides:
- Near 100% ISBN hit rate (Open Library + Google Books combined cover virtually all modern English-language books).
- Cover images without a separate CDN dependency.
- No monetary cost and no strict rate-limit risk for a personal-scale app.

ISBNdb is worth revisiting only if data quality gaps become a real user-facing problem after launch.

---

## Series Information Lookup Research

### Summary

Finding accurate series name and series number for a book requires checking multiple data sources in
priority order. Neither Open Library nor Google Books guarantees a structured, machine-readable series
field, but Open Library exposes the most reliable path.

### Best Approach: Edition-first, then Work-level fallback

Open Library exposes a `series` array at **two levels**, both returning strings like
`"Animorphs #1"`, `"Harry Potter ; 3"`, or `"His Dark Materials ; bk. 1"`:

| Priority | Endpoint | Notes |
|----------|----------|-------|
| 1 | `GET /isbn/{isbn}.json` | **Edition level** — most direct and commonly populated. Recommended by Open Library as the future-proof endpoint. |
| 2 | `GET /works/{key}.json` | **Work level** — fetched anyway for description; also checked for `series` when the edition has none. |
| 3 | Prompt the user | Neither source has data — show a UI notice and let the user enter series info manually. |

#### Why `/isbn/{isbn}.json` is preferred over the legacy Books API

The legacy `/api/books?jscmd=data` endpoint (still used for its convenient rich metadata: cover URLs,
author names, subject names) does **not** expose a `series` field. The modern `/isbn/{isbn}.json`
endpoint does.

```
# Best-practice primary lookup for series data
GET https://openlibrary.org/isbn/{isbn}.json
→ "series": ["Animorphs #1"]   ← edition-level series, most reliable
```

#### Series string formats encountered in Open Library data

The `series` field is always an array of strings, but the format varies by how the record was
catalogued:

| Format | Example | Notes |
|--------|---------|-------|
| `Name #N` | `"Animorphs #1"` | Most common for children's/YA series |
| `Name ; N` | `"Harry Potter ; 3"` | Semicolon separator, common in library cataloguing |
| `Name ; bk. N` | `"His Dark Materials ; bk. 1"` | Semicolon + book abbreviation |
| `Name, Book N` | `"The Chronicles of Narnia, Book 1"` | Comma + "Book" word |
| `Name, N` | `"Animorphs, 1"` | Comma + bare number |
| `Name` | `"Animorphs"` | Name only, no number |

All of these are handled by `ParseSeriesString` in `OpenLibraryBookLookupService`.

### Approaches Investigated but Not Used

#### `collectionID` subject → collection endpoint → `lending_edition` (removed)

Early research noted that some edition records contain a subject like `"collectionID:Animorphs"` with a
URL to the collection endpoint (`/subjects/collectionid:animorphs.json`). That endpoint lists works in
the collection, some with a `lending_edition` key pointing to another work JSON that sometimes has
`series` data.

**This approach was removed** because:
- It requires 2–3 additional HTTP requests per lookup.
- The `lending_edition` work does not reliably contain series data — it depends on which
  specific edition Internet Archive has available for lending.
- The direct `/isbn/{isbn}.json` → `/works/{key}.json` path is simpler, fewer requests, and more
  reliable.

#### Google Books `categories` field

Google Books returns a `categories` array (e.g. `["Fiction"]`) but does **not** expose a structured
series field. Series information is sometimes embedded in the `title` or `subtitle` fields
(e.g. `"Animorphs #1: The Invasion"`) but this requires fragile string parsing and is not reliable
enough for automatic extraction.

### Implementation in Collectors Vault

`OpenLibraryBookLookupService.LookupByIsbnAsync` uses the following request sequence:

1. `GET /api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data` — rich metadata (cover URLs, author names, subject names, publisher).
2. `GET /isbn/{isbn}.json` — edition-level `series` field (primary series source).
3. `GET /works/{workKey}.json` — description + work-level `series` fallback.

If neither step 2 nor step 3 resolves the series, the UI leaves the Series Name/Number fields empty
for the user to fill in manually.

---

## Quick Reference: API Endpoint Cheat Sheet

```
# Open Library — no key needed
ISBN (rich metadata):     GET https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data
ISBN (edition + series):  GET https://openlibrary.org/isbn/{isbn}.json       ← primary series source
Work (desc + series fallback): GET https://openlibrary.org/works/{key}.json  ← description + series fallback
Title:  GET https://openlibrary.org/search.json?title={title}&limit=5
Author: GET https://openlibrary.org/search.json?author={author}&limit=5
Cover:  https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg  (direct image URL)

# Google Books — add &key={YOUR_KEY} for reliable quota
ISBN:   GET https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}
Title:  GET https://www.googleapis.com/books/v1/volumes?q=intitle:{title}&maxResults=5
Author: GET https://www.googleapis.com/books/v1/volumes?q=inauthor:{author}&maxResults=5

# ISBNdb — Authorization: {YOUR_KEY} header always required
ISBN:   GET https://api2.isbndb.com/books/{isbn}
Title:  GET https://api2.isbndb.com/search/books?column=title&value={title}
Author: GET https://api2.isbndb.com/search/books?column=author&value={author}
```

---

*Research conducted: March 2026. API terms and quotas are subject to change; always verify against the provider's current documentation before implementation.*
