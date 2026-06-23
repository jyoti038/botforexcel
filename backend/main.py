from fastapi import FastAPI, UploadFile, File
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploaded_df = None


@app.get("/")
def home():
    return {"message": "Backend Running"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global uploaded_df

    # Read Excel safely (no hard header assumption)
    uploaded_df = pd.read_excel(file.file)

    # Drop fully empty rows/cols
    uploaded_df.dropna(how="all", inplace=True)
    uploaded_df.dropna(axis=1, how="all", inplace=True)

    # Fix unnamed columns
    uploaded_df = uploaded_df.loc[
        :, ~uploaded_df.columns.astype(str).str.contains("Unnamed")
    ]

    # Clean column names
    uploaded_df.columns = (
        uploaded_df.columns
        .astype(str)
        .str.strip()
        .str.lower()
    )

    uploaded_df = uploaded_df.fillna("")

    return {
        "message": "File uploaded successfully",
        "rows": len(uploaded_df),
        "columns": list(uploaded_df.columns)
    }


@app.post("/chat")
async def chat(data: dict):
    global uploaded_df

    if uploaded_df is None:
        return {"answer": "Please upload a file first"}

    question = data["message"].lower()

    # Rows
    if "rows" in question:
        return {"answer": f"Total rows: {len(uploaded_df)}"}

    # Columns
    if "columns" in question:
        return {"answer": list(uploaded_df.columns)}

    # Show data
    if "show data" in question:
        return {
            "answer": uploaded_df.head().to_dict(orient="records")
        }

    # Safe column checker
    def has_col(col):
        return col in uploaded_df.columns

    # FAILED
    if "failed" in question:
        if has_col("status"):
            failed = uploaded_df[
                uploaded_df["status"].astype(str).str.lower() == "failed"
            ]
            return {"answer": failed.to_dict(orient="records")}

    # SUCCESS
    if "success" in question:
        if has_col("status"):
            success = uploaded_df[
                uploaded_df["status"].astype(str).str.lower() == "success"
            ]
            return {"answer": success.to_dict(orient="records")}

    # COUNT FAILED
    if "count failed" in question:
        if has_col("status"):
            count = len(
                uploaded_df[
                    uploaded_df["status"].astype(str).str.lower() == "failed"
                ]
            )
            return {"answer": f"Failed Transactions Count: {count}"}

    # AMOUNT SUM
    if "amount" in question:
        if has_col("amount"):
            uploaded_df["amount"] = pd.to_numeric(
                uploaded_df["amount"],
                errors="coerce"
            )
            return {
                "answer": f"Total Amount: {uploaded_df['amount'].sum()}"
            }

    # SUM / TOTAL
    if "sum" in question or "total" in question:
        numeric_cols = uploaded_df.select_dtypes(include="number")
        return {"answer": numeric_cols.sum().to_dict()}

    return {
        "answer": """
Try:
- rows
- columns
- show data
- failed transactions
- success transactions
- count failed transactions
- total amount
"""
    }