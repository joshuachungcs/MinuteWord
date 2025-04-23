import csv
import json
import os
import random # Import the random module
import re # Import re for parsing
import time # For timing execution

# --- Configuration ---
# Input Files
bible_csv_file_path = '/Users/joshuachung/Documents/bibleclock/bibles_csv/EN-English/web.csv'
quote_csv_file_path = '/Users/joshuachung/Documents/bibleclock/quotes.csv'
# Output File
output_json_file_path = '/Users/joshuachung/Documents/bibleclock/time_verse_mapping_generated.json' # New output name

# --- Constants ---
# BOOK_NUMBER_TO_NAME (Ensure this is accurate and complete)
BOOK_NUMBER_TO_NAME = {
    1: "Genesis", 2: "Exodus", 3: "Leviticus", 4: "Numbers", 5: "Deuteronomy",
    6: "Joshua", 7: "Judges", 8: "Ruth", 9: "1 Samuel", 10: "2 Samuel",
    11: "1 Kings", 12: "2 Kings", 13: "1 Chronicles", 14: "2 Chronicles", 15: "Ezra",
    16: "Nehemiah", 17: "Esther", 18: "Job", 19: "Psalms", 20: "Proverbs",
    21: "Ecclesiastes", 22: "Song of Solomon", 23: "Isaiah", 24: "Jeremiah", 25: "Lamentations",
    26: "Ezekiel", 27: "Daniel", 28: "Hosea", 29: "Joel", 30: "Amos",
    31: "Obadiah", 32: "Jonah", 33: "Micah", 34: "Nahum", 35: "Habakkuk",
    36: "Zephaniah", 37: "Haggai", 38: "Zechariah", 39: "Malachi",
    40: "Matthew", 41: "Mark", 42: "Luke", 43: "John", 44: "Acts",
    45: "Romans", 46: "1 Corinthians", 47: "2 Corinthians", 48: "Galatians", 49: "Ephesians",
    50: "Philippians", 51: "Colossians", 52: "1 Thessalonians", 53: "2 Thessalonians",
    54: "1 Timothy", 55: "2 Timothy", 56: "Titus", 57: "Philemon", 58: "Hebrews",
    59: "James", 60: "1 Peter", 61: "2 Peter", 62: "1 John", 63: "2 John",
    64: "3 John", 65: "Jude", 66: "Revelation"
}

# --- NEW: Create Inverse Mapping ---
BOOK_NAME_TO_NUMBER = {name: num for num, name in BOOK_NUMBER_TO_NAME.items()}
# --- END NEW ---


# --- Tagging Keywords ---
# Simple mapping for demonstration. Could be more sophisticated.
WEATHER_KEYWORD_MAP = {
    "sun": "weather:sunny", "heat": "weather:hot", "scorching": "weather:hot",
    "rain": "weather:rainy", "shower": "weather:rainy", "flood": "weather:rainy",
    "storm": "weather:stormy", "tempest": "weather:stormy", "whirlwind": "weather:stormy",
    "wind": "weather:windy", "breeze": "weather:windy",
    "cloud": "weather:cloudy", "clouds": "weather:cloudy", "sky": "weather:sky", # Sky is generic
    "snow": "weather:snowy", "hail": "weather:hail", "frost": "weather:frosty", "ice": "weather:icy",
    "lightning": "weather:lightning", "thunder": "weather:thunder",
    "drought": "weather:dry", "mist": "weather:misty", "dew": "weather:dew",
    "rainbow": "weather:rainbow"
}

TIME_OF_DAY_KEYWORD_MAP = {
    "morning": "time_of_day:morning", "dawn": "time_of_day:morning", "daybreak": "time_of_day:morning", "sunrise": "time_of_day:morning",
    "noon": "time_of_day:noon", "noonday": "time_of_day:noon",
    "afternoon": "time_of_day:afternoon",
    "evening": "time_of_day:evening", "dusk": "time_of_day:evening", "twilight": "time_of_day:evening", "sunset": "time_of_day:evening",
    "night": "time_of_day:night", "midnight": "time_of_day:night",
    "day": "time_of_day:day", "daytime": "time_of_day:day", "daily": "time_of_day:day", # Generic day
    "hour": "time_of_day:hour", # Specific mention of hour
    "watch": "time_of_day:watch" # Night watches
}

# --- Holiday Verse Ranges (Copied from original) ---
HOLIDAY_VERSE_RANGES = {
    "Advent": ["Isaiah 9:2-7", "Isaiah 11:1-10", "Luke 1:26-38", "Matthew 1:18-25"],
    "Christmas": ["Luke 2:1-20", "Matthew 2:1-12", "John 1:1-14", "Isaiah 9:6"],
    "Epiphany": ["Matthew 2:1-12", "Matthew 3:13-17", "John 2:1-11"],
    "Lent": ["Matthew 4:1-11", "Joel 2:12-18", "Psalm 51:1-17"],
    "Palm Sunday": ["Matthew 21:1-11", "Mark 11:1-11", "Luke 19:28-44", "John 12:12-19"],
    "Maundy Thursday": ["John 13:1-17", "Luke 22:14-23", "Matthew 26:26-30", "Mark 14:22-26", "1 Corinthians 11:23-26"],
    "Good Friday": ["Matthew 27:27-56", "Mark 15:16-41", "Luke 23:26-49", "John 19:16-37", "Isaiah 52:13-53:12"],
    "Holy Saturday": ["Matthew 27:57-66", "John 19:38-42", "1 Peter 3:18-20", "Lamentations 3:1-9"],
    "Easter Sunday": ["Matthew 28:1-10", "Mark 16:1-8", "Luke 24:1-12", "John 20:1-18", "1 Corinthians 15:1-11"],
    "Ascension": ["Luke 24:50-53", "Acts 1:1-11"],
    "Pentecost": ["Acts 2:1-13", "Acts 2:14-41", "Joel 2:28-32"]
}

# --- Helper Functions ---

def load_csv_file(file_path, skip_header=True, delimiter=','):
    """Loads data from a CSV file into a list of lists."""
    print(f"Attempting to load CSV data from {file_path}...")
    rows = []
    try:
        with open(file_path, mode='r', encoding='utf-8', newline='') as csvfile:
            reader = csv.reader(csvfile, delimiter=delimiter)
            if skip_header:
                try:
                    header = next(reader, None)
                    print(f"Skipped header: {header}")
                except StopIteration:
                    print("Warning: CSV file is empty or has no header.")
                    return [] # Return empty list if only header exists or file is empty
            for row in reader:
                rows.append(row)
        print(f"CSV data loaded successfully from {file_path}. Found {len(rows)} data rows.")
        return rows
    except FileNotFoundError:
        print(f"Error: CSV file not found at {file_path}")
        return None
    except Exception as e:
        print(f"Error reading CSV file {file_path}: {e}")
        return None

def parse_verse_ref_string(ref_string):
    """
    Parses a verse reference string (e.g., "John 3:16", "1 Corinthians 11:23-26")
    into book name, chapter, start verse, and end verse.
    Handles potential BOM character at the start.
    """
    if not ref_string or not isinstance(ref_string, str):
        return None, None, None, None
    cleaned_ref = ref_string.strip('\ufeff').strip() # Remove BOM and whitespace

    # Regex to capture book (potentially multi-word), chapter, start verse, and optional end verse
    # Adjusted regex slightly to better handle single-digit book prefixes like "1 John"
    match = re.match(r"^\s*(\d?\s*[a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+(\d+):(\d+)(?:-(\d+))?\s*$", cleaned_ref)
    if not match:
        # Try matching Psalms format like "Psalm 51:1-17" (no space after Psalm)
        # Also handles books like "John" without a number prefix
        match = re.match(r"^\s*([a-zA-Z]+)\s+(\d+):(\d+)(?:-(\d+))?\s*$", cleaned_ref)
        if not match:
             # print(f"Debug: Could not parse ref string: '{cleaned_ref}'") # Optional debug
             return None, None, None, None

    try:
        book_name = match.group(1).strip()
        chapter = int(match.group(2))
        start_verse = int(match.group(3))
        end_verse_str = match.group(4)
        end_verse = int(end_verse_str) if end_verse_str else start_verse # If no end verse, it's the same as start

        if chapter <= 0 or start_verse <= 0 or end_verse < start_verse:
            # print(f"Debug: Invalid numbers in parsed ref: {book_name} {chapter}:{start_verse}-{end_verse}") # Optional debug
            return None, None, None, None

        return book_name, chapter, start_verse, end_verse
    except (ValueError, IndexError, AttributeError):
        # print(f"Debug: Error during parsing/conversion for: '{cleaned_ref}'") # Optional debug
        return None, None, None, None

def get_holiday_tag(book_name, chapter_num, verse_num, holiday_ranges_dict):
    """Checks if a given verse falls within any defined holiday verse ranges."""
    if not (book_name and isinstance(chapter_num, int) and isinstance(verse_num, int)):
        return None

    for holiday_name, range_list in holiday_ranges_dict.items():
        for range_string in range_list:
            range_book, range_chap, range_start, range_end = parse_verse_ref_string(range_string)
            # Ensure the range string itself could be parsed
            if range_book is not None and range_chap is not None and range_start is not None:
                if (book_name == range_book and
                    chapter_num == range_chap and
                    range_start <= verse_num <= range_end):
                    # print(f"Debug: Match found! {book_name} {chapter_num}:{verse_num} is in '{range_string}' for '{holiday_name}'") # Optional debug
                    return f"holiday:{holiday_name.lower().replace(' ', '_')}" # e.g., holiday:good_friday

    return None

def add_item_to_mapping(mapping_dict, hour, minute, item):
    """Adds an item (verse dict or quote dict) to the mapping."""
    time_key = f"{hour:02d}:{minute:02d}"
    if time_key not in mapping_dict:
        mapping_dict[time_key] = []
    # Avoid adding duplicates (simple check based on content)
    # Check based on 'ref' for verses and 'text' for quotes
    is_duplicate = False
    if item.get("type") == "verse":
        ref_to_check = item.get("ref")
        if ref_to_check:
            is_duplicate = any(existing_item.get("type") == "verse" and existing_item.get("ref") == ref_to_check for existing_item in mapping_dict[time_key])
    elif item.get("type") == "quote":
        text_to_check = item.get("text")
        if text_to_check:
             is_duplicate = any(existing_item.get("type") == "quote" and existing_item.get("text") == text_to_check for existing_item in mapping_dict[time_key])

    if not is_duplicate:
         mapping_dict[time_key].append(item)
    # else:
    #     print(f"Debug: Skipping duplicate item for {time_key}: {item.get('ref') or item.get('text')}")


# --- Main Script Execution ---
start_time = time.time()
print("--- Bible Clock Data Generation Script ---")

# --- Step 1: Load all CSV files ---
print("\n--- Loading Bible Verses (for Validation and Tagging) ---")
valid_verses = set()
verse_text_map = {} # Dictionary to map ref -> text

# --- ADJUSTED COLUMN INDICES based on web.csv header ---
# "VerseID","BookName","BookNumber",Chapter,Verse,Text
#    0          1           2         3       4     5
BOOK_NAME_COLUMN = 1   # Column index 1 for BookName
# BOOK_NUM_COLUMN = 2    # We don't need BookNumber if BookName is present
CHAPTER_NUM_COLUMN = 3 # Column index 3 for Chapter
VERSE_NUM_COLUMN = 4   # Column index 4 for Verse
VERSE_TEXT_COLUMN = 5  # Column index 5 for Text
# --- END ADJUSTMENT ---

# Determine the highest index needed to check row length
MAX_BIBLE_COLUMN_INDEX = max(BOOK_NAME_COLUMN, CHAPTER_NUM_COLUMN, VERSE_NUM_COLUMN, VERSE_TEXT_COLUMN)

bible_rows = load_csv_file(bible_csv_file_path, skip_header=True) # Skip the header row
if bible_rows is not None:
    print(f"Processing {len(bible_rows)} Bible rows...")
    rows_processed = 0
    rows_skipped_length = 0
    rows_skipped_missing_data = 0
    rows_skipped_conversion = 0 # Keep this in case Chapter/Verse aren't numbers

    for i, row in enumerate(bible_rows):
        rows_processed += 1
        # Ensure row has enough columns
        if not row or len(row) <= MAX_BIBLE_COLUMN_INDEX:
            # print(f"Warning: Skipping row {i+2} due to insufficient columns: {row}") # Optional debug (i+2 because header skipped and enumerate starts at 0)
            rows_skipped_length += 1
            continue

        # Extract data from columns, stripping whitespace
        book_name_str = row[BOOK_NAME_COLUMN].strip()
        chapter_num_str = row[CHAPTER_NUM_COLUMN].strip()
        verse_num_str = row[VERSE_NUM_COLUMN].strip()
        verse_text = row[VERSE_TEXT_COLUMN].strip()

        # Ensure essential data exists
        if not book_name_str or not chapter_num_str or not verse_num_str or not verse_text:
             # print(f"Warning: Skipping row {i+2} due to missing book/chapter/verse/text.") # Optional debug
             rows_skipped_missing_data += 1
             continue

        # --- Validate chapter/verse are numbers before constructing ref ---
        try:
            # We don't strictly need the integers here, but it's a good validation
            # Store them as strings for consistency in the ref construction
            int(chapter_num_str)
            int(verse_num_str)
        except ValueError:
            # print(f"Warning: Skipping row {i+2} due to non-integer chapter/verse: {row}") # Optional debug
            rows_skipped_conversion += 1
            continue

        # Construct the standard verse reference string ("BookName Chapter:Verse")
        # This format is used internally for validation and tagging
        verse_ref = f"{book_name_str} {chapter_num_str}:{verse_num_str}"

        # Add the constructed reference and text
        valid_verses.add(verse_ref)
        verse_text_map[verse_ref] = verse_text

    print(f"Finished processing {rows_processed} rows.")
    print(f"Skipped {rows_skipped_length} rows (insufficient columns).")
    print(f"Skipped {rows_skipped_missing_data} rows (missing data).")
    print(f"Skipped {rows_skipped_conversion} rows (conversion error).")
    print(f"Loaded {len(valid_verses)} unique valid verse references with text.")

    if not valid_verses:
        print("Error: No valid verses loaded from Bible CSV. Cannot proceed.")
        # print("Last attempted row:", row if 'row' in locals() else 'N/A') # Optional debug
        exit(1)
else:
    print("Error: Failed to load Bible verses CSV. Exiting.")
    exit(1)

# --- Loading Quotes (Corrected based on QuoteID, Text, Source header) ---
print("\n--- Loading Quotes ---")
all_quotes = []
# Header: QuoteID, Text, Source (Indices 0, 1, 2)
# We need Text (1) and Source (2)
QUOTE_TEXT_COLUMN = 1 # Index for Text
QUOTE_SOURCE_COLUMN = 2 # Index for Source

# Determine the highest index needed for quotes
MAX_QUOTE_COLUMN_INDEX = max(QUOTE_TEXT_COLUMN, QUOTE_SOURCE_COLUMN)

quote_rows = load_csv_file(quote_csv_file_path, skip_header=True) # Skip the header row
if quote_rows is not None:
    print(f"Processing {len(quote_rows)} quote rows...")
    quotes_skipped_length = 0
    quotes_skipped_missing_text = 0
    quotes_stripped_quotes = 0 # Counter for quotes that were stripped

    for row_num, row in enumerate(quote_rows, start=2): # Start row count from 2 for messages
         # Ensure row has enough columns to access Text and Source
         if row and len(row) > MAX_QUOTE_COLUMN_INDEX:
             # 1. Strip leading/trailing whitespace
             # 2. Strip leading/trailing standard double quotes (")
             #    and typographic quotes (“ ”)
             original_text = row[QUOTE_TEXT_COLUMN].strip()
             # Chain strip calls for different quote types
             quote_text = original_text.strip('"').strip('“').strip('”')
             # --- MODIFICATION END ---

             # Check if stripping quotes actually changed the text
             if original_text != quote_text:
                 quotes_stripped_quotes += 1

             quote_source = row[QUOTE_SOURCE_COLUMN].strip()

             if quote_text: # Only add if text exists *after* potential stripping
                 all_quotes.append({
                     "type": "quote",
                     "text": quote_text, # Use the potentially modified text
                     "source": quote_source if quote_source else "Unknown",
                     "tags": []
                 })
             else:
                 # print(f"Warning: Skipping quote row {row_num} due to missing text in column {QUOTE_TEXT_COLUMN+1} (or text became empty after stripping).") # Optional debug
                 quotes_skipped_missing_text += 1
         else:
             # print(f"Warning: Skipping quote row {row_num} due to insufficient columns (needed {MAX_QUOTE_COLUMN_INDEX+1}, got {len(row)}).") # Optional debug
             quotes_skipped_length += 1

    print(f"Skipped {quotes_skipped_length} quote rows (insufficient columns).")
    print(f"Skipped {quotes_skipped_missing_text} quote rows (missing/empty text).")
    # Add info about stripped quotes
    if quotes_stripped_quotes > 0:
        print(f"Removed leading/trailing double quotes from {quotes_stripped_quotes} quote texts.")
    print(f"Loaded {len(all_quotes)} quotes.")
    if not all_quotes:
        print("Warning: No quotes loaded. Quote-related steps will be skipped.")
else:
    print("Warning: Failed to load quotes CSV. Quote-related steps will be skipped.")

# --- Steps 2-5: Generate Initial Time Mapping ---
print("\n--- Generating Initial Time Mapping (00:00 - 23:59) ---")
generated_mapping = {}
verses_added_initially = 0
quotes_added_initially = 0

# Define the books for hour 0 rule
hour_zero_books = {31, 57, 63, 64, 65} # Obadiah, Philemon, 2 John, 3 John, Jude

for hour in range(24):
    for minute in range(60):
        time_key = f"{hour:02d}:{minute:02d}"
        generated_mapping[time_key] = [] # Initialize list for the minute

        # Rule 3: Minute 0 - Add 3 random quotes
        if minute == 0:
            if all_quotes:
                num_quotes_to_add = 3
                num_available = len(all_quotes)
                k = min(num_quotes_to_add, num_available)
                if k > 0:
                    try:
                        selected_quotes = random.sample(all_quotes, k)
                        for quote in selected_quotes:
                            # Add a copy to avoid modifying the original list items if needed later
                            add_item_to_mapping(generated_mapping, hour, minute, quote.copy())
                            quotes_added_initially += 1
                    except ValueError as e:
                         print(f"Error sampling quotes for {time_key}: {e}")
                # else: print(f"Debug: Not enough quotes ({num_available}) to add {num_quotes_to_add} at {time_key}")
            # else: print(f"Debug: No quotes available to add at {time_key}")

        # Rule 4: Hour 0, Minute > 0 - Add specific book verses + 2 random quotes
        elif hour == 0: # minute is implicitly > 0 here
            # Add verses from specific single-chapter books
            for book_num in hour_zero_books:
                book_name = BOOK_NUMBER_TO_NAME.get(book_num)
                if book_name:
                    # These books only have 1 chapter
                    chapter_num = 1
                    verse_num = minute # Verse number equals minute number
                    # Generate ref in standard format for validation/tagging
                    verse_ref = f"{book_name} {chapter_num}:{verse_num}"
                    verse_obj = {"type": "verse", "ref": verse_ref, "tags": []}
                    add_item_to_mapping(generated_mapping, hour, minute, verse_obj)
                    verses_added_initially += 1

            # Add 2 random quotes
            if all_quotes:
                num_quotes_to_add = 2
                num_available = len(all_quotes)
                k = min(num_quotes_to_add, num_available)
                if k > 0:
                    try:
                        selected_quotes = random.sample(all_quotes, k)
                        for quote in selected_quotes:
                            add_item_to_mapping(generated_mapping, hour, minute, quote.copy())
                            quotes_added_initially += 1
                    except ValueError as e:
                         print(f"Error sampling quotes for {time_key}: {e}")
                # else: print(f"Debug: Not enough quotes ({num_available}) to add {num_quotes_to_add} at {time_key}")
            # else: print(f"Debug: No quotes available to add at {time_key}")

        # Rule 5: Hour > 0, Minute > 0 - Add verses from all books
        else: # hour > 0 and minute > 0
            for book_num in range(1, 67): # Iterate through all book numbers 1-66
                book_name = BOOK_NUMBER_TO_NAME.get(book_num)
                if book_name:
                    chapter_num = hour
                    verse_num = minute

                    # Special chapter handling for Psalms (Book 19) based on request example
                    if book_num == 19: # Psalms
                        if hour == 3: chapter_num = 30
                        elif hour == 14: chapter_num = 140
                        # else: chapter_num = hour # Default back to hour

                    # Construct verse reference in standard format for validation/tagging
                    verse_ref = f"{book_name} {chapter_num}:{verse_num}"
                    verse_obj = {"type": "verse", "ref": verse_ref, "tags": []}
                    add_item_to_mapping(generated_mapping, hour, minute, verse_obj)
                    verses_added_initially += 1

print(f"Initial generation complete. Added {verses_added_initially} potential verse entries and {quotes_added_initially} quote entries.")

# --- Step 6: Check and Remove Non-Existent Verses ---
print("\n--- Validating Verses and Removing Non-Existent Ones ---")
validated_mapping = {}
removed_count = 0
final_verse_count = 0
final_quote_count = 0

for time_key, items_list in generated_mapping.items():
    valid_items_for_time = []
    if not isinstance(items_list, list):
        print(f"Warning: Data for {time_key} is not a list. Skipping validation for this key.")
        validated_mapping[time_key] = items_list # Keep non-list data as is? Or discard? Let's keep.
        continue

    for item in items_list:
        if isinstance(item, dict):
            item_type = item.get("type")
            if item_type == "verse":
                verse_ref = item.get("ref") # This is still "BookName Chapter:Verse"
                if verse_ref and verse_ref in valid_verses: # Check against the set loaded in Step 1
                    valid_items_for_time.append(item)
                    final_verse_count += 1
                else:
                    # print(f"Removing invalid verse ref at {time_key}: '{verse_ref}'") # Can be verbose
                    removed_count += 1
            elif item_type == "quote":
                valid_items_for_time.append(item) # Keep quotes
                final_quote_count += 1
            else:
                 print(f"Warning: Item with unknown type '{item_type}' found at {time_key}. Keeping.")
                 valid_items_for_time.append(item) # Keep unknown items
        else:
             print(f"Warning: Non-dict item found at {time_key}. Discarding: {item}")

    # Only add the time key back if it has valid items
    if valid_items_for_time:
        validated_mapping[time_key] = valid_items_for_time
    # else:
    #     print(f"Debug: No valid items remaining for {time_key}. Key removed.")


print(f"Verse validation complete. Removed {removed_count} non-existent verse references.")
print(f"Validated mapping contains {final_verse_count} verses and {final_quote_count} quotes.")

# --- Step 7: Tag Verses ---
print("\n--- Tagging Verses (Weather, Time of Day, Holiday) ---")
tagged_mapping = validated_mapping # Modify in place
weather_tags_added = 0
time_tags_added = 0
holiday_tags_added = 0
verses_processed_for_tags = 0

# Pre-compile regex patterns for keywords for slight efficiency
weather_patterns = {tag: re.compile(r'\b' + keyword + r'\b', re.IGNORECASE) for keyword, tag in WEATHER_KEYWORD_MAP.items()}
time_patterns = {tag: re.compile(r'\b' + keyword + r'\b', re.IGNORECASE) for keyword, tag in TIME_OF_DAY_KEYWORD_MAP.items()}

for time_key, items_list in tagged_mapping.items():
    if not isinstance(items_list, list): continue

    for item in items_list:
        if isinstance(item, dict) and item.get("type") == "verse":
            verses_processed_for_tags += 1
            verse_ref = item.get("ref") # Still "BookName Chapter:Verse"
            if not verse_ref: continue

            # Ensure tags list exists
            item.setdefault("tags", [])

            # Get verse text using the standard ref format
            verse_text = verse_text_map.get(verse_ref)
            if not verse_text:
                # print(f"Warning: No text found for verse {verse_ref} during tagging.")
                continue

            # 1. Weather Tagging
            for tag, pattern in weather_patterns.items():
                if pattern.search(verse_text):
                    if tag not in item["tags"]:
                        item["tags"].append(tag)
                        weather_tags_added += 1
                        # Optimization: If a weather tag is found, maybe break? Depends if multiple are desired.
                        # break # Uncomment if only one weather tag per verse is needed

            # 2. Time of Day Tagging
            for tag, pattern in time_patterns.items():
                 if pattern.search(verse_text):
                    if tag not in item["tags"]:
                        item["tags"].append(tag)
                        time_tags_added += 1
                        # Optimization: If a time tag is found, maybe break?
                        # break # Uncomment if only one time tag per verse is needed

            # 3. Holiday Tagging (Uses parse_verse_ref_string which needs standard format)
            parsed_book, parsed_chap, parsed_verse, _ = parse_verse_ref_string(verse_ref)
            if parsed_book and parsed_chap and parsed_verse: # Ensure parsing worked
                holiday_tag = get_holiday_tag(parsed_book, parsed_chap, parsed_verse, HOLIDAY_VERSE_RANGES)
                if holiday_tag and holiday_tag not in item["tags"]:
                    item["tags"].append(holiday_tag)
                    holiday_tags_added += 1


print(f"Tagging complete. Processed {verses_processed_for_tags} verses.")
print(f"Added {weather_tags_added} weather tags, {time_tags_added} time tags, and {holiday_tags_added} holiday tags.")


# --- Step 7.5: Transform Verse References to Numerical Format ---
print("\n--- Transforming Verse References to Numerical Format ---")
transformed_count = 0
final_data_for_export = {} # Create a new dict to store transformed data

for time_key, items_list in tagged_mapping.items():
    transformed_items = []
    if not isinstance(items_list, list):
        print(f"Warning: Data for {time_key} is not a list. Skipping transformation.")
        final_data_for_export[time_key] = items_list # Keep as is
        continue

    for item in items_list:
        if isinstance(item, dict) and item.get("type") == "verse":
            original_ref = item.get("ref")
            if original_ref:
                # Parse the standard "BookName Chapter:Verse" ref
                parsed_book, parsed_chap, parsed_verse, _ = parse_verse_ref_string(original_ref)

                if parsed_book and parsed_chap and parsed_verse:
                    # Look up the book number
                    book_number = BOOK_NAME_TO_NUMBER.get(parsed_book)
                    if book_number is not None:
                        # Create the new numerical reference string
                        new_ref = f"{book_number}:{parsed_chap}:{parsed_verse}"
                        # Create a copy of the item and update the ref
                        transformed_item = item.copy()
                        transformed_item["ref"] = new_ref
                        transformed_items.append(transformed_item)
                        transformed_count += 1
                    else:
                        print(f"Warning: Could not find book number for '{parsed_book}' in ref '{original_ref}'. Keeping original.")
                        transformed_items.append(item) # Keep original if lookup fails
                else:
                    print(f"Warning: Could not parse original ref '{original_ref}' during transformation. Keeping original.")
                    transformed_items.append(item) # Keep original if parsing fails
            else:
                transformed_items.append(item) # Keep item if it has no ref
        else:
            transformed_items.append(item) # Keep non-verse items as they are

    if transformed_items: # Only add if list is not empty
        final_data_for_export[time_key] = transformed_items

print(f"Transformed {transformed_count} verse references to numerical format.")
# --- END Step 7.5 ---


# --- NEW Step 7.75: Ensure All Time Keys Exist and Add Quotes if Missing ---
print("\n--- Ensuring All Time Keys Exist (00:00 - 23:59) ---")
missing_times_filled = 0
quotes_added_for_missing = 0

# Check if quotes are available *before* the loop for efficiency
quotes_available = all_quotes and len(all_quotes) > 0

for hour in range(24):
    for minute in range(60):
        time_key = f"{hour:02d}:{minute:02d}"

        if time_key not in final_data_for_export:
            missing_times_filled += 1
            # print(f"Debug: Time key {time_key} is missing. Adding quotes.") # Optional debug
            new_items_list = []
            if quotes_available:
                num_quotes_to_add = 3
                num_available = len(all_quotes)
                k = min(num_quotes_to_add, num_available)
                if k > 0:
                    try:
                        selected_quotes = random.sample(all_quotes, k)
                        for quote in selected_quotes:
                            # Add a copy to ensure independence if needed elsewhere
                            # Ensure the quote has the standard structure
                            quote_copy = quote.copy()
                            quote_copy.setdefault("type", "quote") # Ensure type is present
                            quote_copy.setdefault("tags", [])     # Ensure tags list is present
                            new_items_list.append(quote_copy)
                            quotes_added_for_missing += 1
                    except ValueError as e:
                        print(f"Error sampling quotes for missing time {time_key}: {e}")
                # else: print(f"Debug: Not enough quotes ({num_available}) to add {num_quotes_to_add} for missing time {time_key}")
            # else: print(f"Debug: No quotes available to add for missing time {time_key}")

            final_data_for_export[time_key] = new_items_list # Add the key with the (potentially empty) list

print(f"Checked all 1440 time slots. Found and filled {missing_times_filled} missing time keys.")
if missing_times_filled > 0:
    print(f"Added {quotes_added_for_missing} quotes to fill these missing time slots.")
# --- END NEW Step 7.75 ---


# --- Step 8: Export the Modified JSON ---
print("\n--- Writing Output JSON ---")
try:
    # Sort the dictionary by time key before writing for consistency
    # Use the final_data_for_export which contains the transformed refs AND filled missing times
    final_sorted_data = dict(sorted(final_data_for_export.items()))
    with open(output_json_file_path, mode='w', encoding='utf-8') as outfile:
        print(f"Writing final sorted and tagged data to {output_json_file_path}...")
        json.dump(final_sorted_data, outfile, indent=4, ensure_ascii=False)
    print("Final JSON data saved successfully.")
except IOError as e:
    print(f"Error writing JSON file {output_json_file_path}: {e}")
except Exception as e:
    print(f"An unexpected error occurred during JSON writing: {e}")

end_time = time.time()
print(f"\nScript finished in {end_time - start_time:.2f} seconds.")

