import os


class Settings:
    app_name: str = "MIH Backend Service"
    app_version: str = "1.0.0"
    ml_service_base_url: str = os.getenv("ML_SERVICE_BASE_URL", "http://localhost:8001")
    ml_service_api_key: str = os.getenv("ML_SERVICE_API_KEY", "dev_shared_key_abcd1234")
    blockchain_service_base_url: str = os.getenv(
        "BLOCKCHAIN_SERVICE_BASE_URL",
        "http://localhost:8545",
    )
    escrow_address: str = os.getenv(
        "ESCROW_ADDRESS", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    )


settings = Settings()
