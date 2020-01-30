module.exports = {
    "data": {
        "addresses": {
            "bitcoincash": "qzf7u3s83j8mz4t208rvygstmtkls89kvylmgfapj3",
            "litecoin": "MQ4DpbTCZuANnGe4QB5b2LVNsM8Ww7PwWK",
            "bitcoin": "3J2MGSGSmweD6mMMCJGEwtsMXHNFJ42ueV",
            "ethereum": "0x72f11a3274e3b92c0daf9f5f770d99e2a0d50775",
            "usdc": "0x72f11a3274e3b92c0daf9f5f770d99e2a0d50775"
        },
        "cancel_url": "http://localhost:8081/?publicKey=FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu",
        "code": "E6YRKC55",
        "created_at": "2020-01-28T20:30:39Z",
        "description": "Payment for kjm@fio",
        "expires_at": "2020-01-28T21:30:39Z",
        "hosted_url": "https://commerce.coinbase.com/charges/E6YRKC55",
        "id": "7da1fb09-7fb7-4a80-ad3c-cc5e3622ed61",
        "metadata": {
            "fpk": "FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu"
        },
        "name": "FIO Account Registration",
        "payments": [
            {
                "network": "ethereum",
                "transaction_id": "0x2fc0aea83fb867493df2c26cb7c48e130f080e93812be10771067d55bf99cc5f",
                "status": "CONFIRMED",
                "detected_at": "2020-01-28T20:48:53Z",
                "value": {
                    "local": {
                        "amount": "0.3",
                        "currency": "USDC"
                    },
                    "crypto": {
                        "amount": "0.000085000",
                        "currency": "ETH"
                    }
                },
                "block": {
                    "height": 9372749,
                    "hash": "0x7ddc40002355306bc0daacd6ec19359470bbad5de4f421b0d84c73fd5cc1cb70",
                    "confirmations": 8,
                    "confirmations_required": 8
                }
            }
        ],
        "pricing": {
            "local": {
                "amount": "0.030000",
                "currency": "USDC"
            },
            "bitcoincash": {
                "amount": "0.00008158",
                "currency": "BCH"
            },
            "litecoin": {
                "amount": "0.00051103",
                "currency": "LTC"
            },
            "bitcoin": {
                "amount": "0.00000331",
                "currency": "BTC"
            },
            "ethereum": {
                "amount": "0.000175000",
                "currency": "ETH"
            },
            "usdc": {
                "amount": "0.030000",
                "currency": "USDC"
            }
        },
        "pricing_type": "fixed_price",
        "redirect_url": "http://localhost:8081/?publicKey=FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu",
        "resource": "charge",
        "timeline": [
            {
                "status": "NEW",
                "time": "2020-01-28T20:30:39Z"
            },
            {
                "status": "PENDING",
                "time": "2020-01-28T20:48:53Z",
                "payment": {
                    "network": "ethereum",
                    "transaction_id": "0x2fc0aea83fb867493df2c26cb7c48e130f080e93812be10771067d55bf99cc5f"
                }
            },
            {
                "status": "UNRESOLVED",
                "context": "UNDERPAID",
                "time": "2020-01-28T20:50:45Z",
                "payment": {
                    "network": "ethereum",
                    "transaction_id": "0x2fc0aea83fb867493df2c26cb7c48e130f080e93812be10771067d55bf99cc5f"
                }
            }
        ]
    }
}
