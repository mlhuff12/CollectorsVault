namespace CollectorsVault.Server.Contracts
{
    public class SignupRequest
    {
        public string Username { get; set; } = string.Empty;
    }

    public class SignupResponse
    {
        public string Username { get; set; } = string.Empty;
        public string TotpUri { get; set; } = string.Empty;
        public string TotpSecret { get; set; } = string.Empty;
    }

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string TotpCode { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
    }
}
