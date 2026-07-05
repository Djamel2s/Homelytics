from sklearn.datasets import fetch_california_housing
import pandas as pd

def main():
    dataset = fetch_california_housing(as_frame=True)
    df = dataset.frame
    df.to_csv("data/california_housing.csv", index=False)
    print(f"Dataset saved: {df.shape[0]} rows, {df.shape[1]} columns")

if __name__ == "__main__":
    main()