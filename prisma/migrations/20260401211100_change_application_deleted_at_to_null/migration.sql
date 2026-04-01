UPDATE inspection_application SET status = 'CANCELED' WHERE deleted_at IS NOT NULL AND status IS NULL;
UPDATE inspection_application SET deleted_at = NULL;