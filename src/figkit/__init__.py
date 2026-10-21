"""figkit: webapps that are the interactive counterparts of scientific papers."""

__version__ = "0.1.0.dev0"

from figkit.data import DataError, Dataset, export, load  # noqa: E402

__all__ = ["DataError", "Dataset", "__version__", "export", "load"]
