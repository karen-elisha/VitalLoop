import sys
import os

# Add the parent directory (ai-service root) to sys.path
# so that tests can import 'main' and other modules directly.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
