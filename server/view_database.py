import sqlite3
from pathlib import Path


# Automatically find mindcare.db in the same folder as this script
BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "mindcare.db"


def print_table(table_name, headers, rows):
    print("\n" + "=" * 120)
    print(f"TABLE: {table_name}")
    print("=" * 120)

    if not rows:
        print("No records found.")
        return

    # Convert values to strings
    data = []

    for row in rows:
        data.append([
            "NULL" if value is None else str(value)
            for value in row
        ])

    # Calculate column widths
    widths = []

    for i, header in enumerate(headers):
        width = len(str(header))

        for row in data:
            if i < len(row):
                width = max(width, len(row[i]))

        # Limit very large columns
        width = min(width, 40)
        widths.append(width)

    # Header
    header_line = " | ".join(
        str(header)[:widths[i]].ljust(widths[i])
        for i, header in enumerate(headers)
    )

    separator = "-+-".join(
        "-" * width for width in widths
    )

    print(header_line)
    print(separator)

    # Rows
    for row in data:
        values = []

        for i in range(len(headers)):
            value = row[i] if i < len(row) else ""

            if len(value) > widths[i]:
                value = value[:widths[i] - 3] + "..."

            values.append(value.ljust(widths[i]))

        print(" | ".join(values))

    print(f"\nTotal records: {len(rows)}")


def main():

    print("=" * 120)
    print("                    MINDCARE AI DATABASE VIEWER")
    print("=" * 120)

    print(f"Database location:")
    print(DB_FILE)

    # Check database
    if not DB_FILE.exists():
        print("\nERROR: mindcare.db was not found.")
        print("Expected location:")
        print(DB_FILE)
        return

    try:
        connection = sqlite3.connect(DB_FILE)
        cursor = connection.cursor()

        # Get all tables
        tables = cursor.execute("""
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """).fetchall()

        print(f"\nTables found: {len(tables)}")

        if not tables:
            print("No tables found.")
            connection.close()
            return

        # Display every table
        for (table_name,) in tables:

            # Get column information
            columns = cursor.execute(
                f'PRAGMA table_info("{table_name}")'
            ).fetchall()

            headers = [column[1] for column in columns]

            # Fetch all rows
            rows = cursor.execute(
                f'SELECT * FROM "{table_name}"'
            ).fetchall()

            print_table(table_name, headers, rows)

        connection.close()

        print("\n" + "=" * 120)
        print("                    DATABASE VIEW COMPLETE")
        print("=" * 120)

    except sqlite3.Error as error:
        print(f"\nDATABASE ERROR: {error}")

    except Exception as error:
        print(f"\nERROR: {error}")


if __name__ == "__main__":
    main()