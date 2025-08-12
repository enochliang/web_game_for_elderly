import os
import json

# Define the base directory for games and the output file path.
# These paths are relative to the script's location (/web_games/).
GAMES_ROOT_DIR = 'games'
OUTPUT_FILE = 'gamesConfig.json'
CATEGORIES = ['brain', 'mix', 'body']

def generate_game_config():
    """
    Scans the game directory structure and generates the gamesConfig.json file.
    """
    # Initialize the main dictionary with fixed categories.
    config_data = {category: [] for category in CATEGORIES}

    # Ensure the base games directory exists.
    if not os.path.isdir(GAMES_ROOT_DIR):
        print(f"Error: Base games directory '{GAMES_ROOT_DIR}' not found.")
        # Write an empty config if the main 'games' directory is missing.
        write_json_file(config_data)
        return

    # Iterate through each category.
    for category in CATEGORIES:
        category_path = os.path.join(GAMES_ROOT_DIR, category)

        # Check if the category directory exists.
        # If not, its list in the JSON will remain empty as per requirements.
        if not os.path.isdir(category_path):
            continue

        # List all items (potential game folders) in the category directory.
        try:
            game_folders = os.listdir(category_path)
        except OSError as e:
            print(f"Error reading directory {category_path}: {e}")
            continue
            
        # Process each item in the category directory.
        for game_name in game_folders:
            game_dir_path = os.path.join(category_path, game_name)

            # Ensure the item is a directory to count it as a game.
            if os.path.isdir(game_dir_path):
                # Create the relative path for the JSON file.
                # os.path.join creates OS-specific paths (e.g., with '\' on Windows).
                # We convert to forward slashes for web compatibility.
                relative_path = os.path.join(GAMES_ROOT_DIR, category, game_name, '').replace('\\', '/')
                
                game_info = {
                    'name': game_name,
                    'path': relative_path
                }
                config_data[category].append(game_info)
    
    # Write the collected data to the JSON file.
    write_json_file(config_data)
    print(f"Successfully generated '{OUTPUT_FILE}'.")

def write_json_file(data):
    """
    Writes the given data dictionary to the output JSON file.
    """
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            # ensure_ascii=False to correctly handle non-ASCII characters.
            # indent=2 for pretty-printing.
            json.dump(data, f, ensure_ascii=False, indent=2)
    except IOError as e:
        print(f"Error writing to file {OUTPUT_FILE}: {e}")

if __name__ == '__main__':
    # Running the script will generate the config file.
    generate_game_config()