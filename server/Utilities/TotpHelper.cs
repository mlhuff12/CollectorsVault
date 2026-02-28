using System;
using System.Security.Cryptography;

namespace CollectorsVault.Server.Utilities
{
    /// <summary>
    /// Provides TOTP (RFC 6238) generation and verification, and Base32 encoding/decoding.
    /// </summary>
    public static class TotpHelper
    {
        private const int Period = 30;
        private const int Digits = 6;
        private static readonly int[] DigitsPower = { 1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000 };

        private static readonly char[] Base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".ToCharArray();

        /// <summary>Generates a cryptographically random Base32 secret (20 bytes = 160 bits).</summary>
        public static string GenerateSecret()
        {
            var bytes = new byte[20];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return ToBase32(bytes);
        }

        /// <summary>Computes the current TOTP code for the given Base32 secret.</summary>
        public static string ComputeTotp(string base32Secret)
        {
            var counter = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / Period;
            return ComputeHotp(base32Secret, counter);
        }

        /// <summary>
        /// Verifies a TOTP code, allowing a window of +/- 1 step to account for clock drift.
        /// </summary>
        public static bool VerifyTotp(string base32Secret, string code)
        {
            if (string.IsNullOrWhiteSpace(code) || code.Length != Digits)
                return false;

            var counter = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / Period;

            for (var i = -1; i <= 1; i++)
            {
                if (ComputeHotp(base32Secret, counter + i) == code)
                    return true;
            }

            return false;
        }

        private static string ComputeHotp(string base32Secret, long counter)
        {
            var key = FromBase32(base32Secret);
            var counterBytes = BitConverter.GetBytes(counter);
            if (BitConverter.IsLittleEndian)
                Array.Reverse(counterBytes);

            byte[] hash;
            using (var hmac = new HMACSHA1(key))
                hash = hmac.ComputeHash(counterBytes);

            var offset = hash[^1] & 0x0F;
            var code = ((hash[offset] & 0x7F) << 24)
                     | ((hash[offset + 1] & 0xFF) << 16)
                     | ((hash[offset + 2] & 0xFF) << 8)
                     | (hash[offset + 3] & 0xFF);

            return (code % DigitsPower[Digits]).ToString().PadLeft(Digits, '0');
        }

        /// <summary>Encodes bytes as a Base32 string (RFC 4648, no padding).</summary>
        public static string ToBase32(byte[] data)
        {
            var output = new System.Text.StringBuilder();
            for (var offset = 0; offset < data.Length;)
            {
                var numCharsToOutput = Math.Min((data.Length - offset) * 8, 40) / 5;
                long buffer = 0;
                var bitsLeft = 0;

                for (var i = 0; i < 8 && offset < data.Length; i++, offset++)
                {
                    buffer = (buffer << 8) | data[offset];
                    bitsLeft += 8;
                }

                while (bitsLeft > 0)
                {
                    bitsLeft -= 5;
                    var index = bitsLeft >= 0
                        ? (int)((buffer >> bitsLeft) & 0x1F)
                        : (int)((buffer << (-bitsLeft)) & 0x1F);
                    output.Append(Base32Chars[index]);
                }
            }

            return output.ToString();
        }

        /// <summary>Decodes a Base32 string (RFC 4648) to bytes.</summary>
        public static byte[] FromBase32(string base32)
        {
            base32 = base32.TrimEnd('=').ToUpperInvariant();
            var output = new byte[base32.Length * 5 / 8];
            var bitsLeft = 0;
            var current = 0;
            var outputIndex = 0;

            foreach (var c in base32)
            {
                var index = Array.IndexOf(Base32Chars, c);
                if (index < 0) continue;

                current = (current << 5) | index;
                bitsLeft += 5;

                if (bitsLeft >= 8)
                {
                    bitsLeft -= 8;
                    output[outputIndex++] = (byte)((current >> bitsLeft) & 0xFF);
                }
            }

            return output;
        }
    }
}
