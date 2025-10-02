# Intercom to Supabase Sync Tool

A robust Python tool for exporting and syncing Intercom conversation data to Supabase, with support for full and incremental syncs, error handling, and progress tracking.

## Features

- 📊 **Full Data Export**: Export all conversations, messages, users, admins, and tags
- 🔄 **Incremental Sync**: Sync only updated conversations since last run
- ⚡ **Parallel Processing**: Efficient batch processing with configurable workers
- 🛡️ **Error Resilience**: Retry logic and comprehensive error handling
- 📈 **Progress Tracking**: Real-time progress bars and sync statistics
- 🔍 **Monitoring**: Sync logs and status tracking in database
- 🎨 **Rich CLI**: Beautiful command-line interface with colored output

## Prerequisites

- Python 3.8+
- Intercom API access token
- Supabase project with service role key

## Installation

1. Clone or copy the `intercom_sync` directory to your project

2. Install dependencies:
```bash
cd intercom_sync
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
# Create .env file
cp .env.example .env

# Edit .env with your credentials:
INTERCOM_ACCESS_TOKEN=your_intercom_token_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

4. Apply database schema to Supabase:
```bash
# Get the schema location
python main.py apply-schema

# Then copy the schema.sql content to your Supabase SQL editor and run it
```

## Configuration

### Environment Variables

```bash
# Intercom API Token (required)
INTERCOM_ACCESS_TOKEN=your_intercom_access_token_here

# Supabase Configuration (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Alternative Supabase env variable names also supported:
# NEXT_PUBLIC_SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
```

## Usage

### Test Connections

Verify your Intercom and Supabase connections:

```bash
python main.py test-connection
```

### Full Sync

Export all conversations from Intercom:

```bash
# Sync all conversations
python main.py full-sync

# Sync conversations within date range
python main.py full-sync --start-date 2024-01-01 --end-date 2024-12-31

# Adjust batch size and workers for performance
python main.py full-sync --batch-size 100 --max-workers 10
```

### Incremental Sync

Sync only recently updated conversations:

```bash
# Sync changes from last 24 hours
python main.py incremental-sync

# Sync changes from last 48 hours
python main.py incremental-sync --hours-back 48
```

### Sync Specific Conversation

Sync a single conversation by ID:

```bash
python main.py sync-conversation --conversation-id 123456789
```

### Watch Mode

Run incremental sync continuously:

```bash
# Sync every 60 minutes (default)
python main.py watch

# Sync every 30 minutes
python main.py watch --interval 30
```

### Check Sync Status

View recent sync operations:

```bash
python main.py sync-status
```

## Database Schema

The tool creates the following tables in Supabase:

- `intercom_conversations` - Main conversation data
- `intercom_messages` - Individual messages/parts within conversations
- `intercom_users` - User and contact information
- `intercom_admins` - Support agent information
- `intercom_tags` - Tag definitions
- `intercom_conversation_tags` - Tag assignments to conversations
- `intercom_sync_logs` - Sync operation history
- `intercom_webhook_events` - Webhook event tracking (for future use)

## Data Mapping

### Conversation Fields

| Intercom Field | Supabase Column | Type |
|---------------|-----------------|------|
| id | conversation_id | TEXT |
| type | type | TEXT |
| created_at | created_at | TIMESTAMPTZ |
| updated_at | updated_at | TIMESTAMPTZ |
| state | state | TEXT |
| open | open | BOOLEAN |
| priority | priority | TEXT |
| source.* | source_* | Various |
| statistics | statistics | JSONB |
| tags | tags | TEXT[] |

### Message Fields

| Intercom Field | Supabase Column | Type |
|---------------|-----------------|------|
| id | message_id | TEXT |
| part_type | part_type | TEXT |
| body | body | TEXT |
| author.* | author_* | Various |
| attachments | attachments | JSONB |
| created_at | created_at | TIMESTAMPTZ |

## Performance Considerations

### Rate Limiting

- Intercom API limit: 500 requests/minute
- Tool automatically handles rate limiting with retry logic
- Configurable parallel workers (default: 5)

### Batch Sizes

- Default batch size: 50 conversations
- Adjust based on conversation complexity
- Larger batches = faster but more memory usage

### Database Optimization

- Proper indexes on frequently queried fields
- JSONB fields for flexible metadata storage
- Timestamp triggers for automatic updated_at

## Error Handling

The tool includes comprehensive error handling:

- **API Errors**: Automatic retry with exponential backoff
- **Rate Limiting**: Automatic pause and retry
- **Network Issues**: Connection retry logic
- **Data Validation**: Skip invalid records with logging
- **Partial Failures**: Continue processing, log errors

## Monitoring

### Sync Logs

Every sync operation is logged with:
- Start/end timestamps
- Record counts (conversations, messages, users)
- Error details
- Sync metadata

### Query Sync History

```sql
-- View recent syncs
SELECT * FROM intercom_sync_logs
ORDER BY started_at DESC
LIMIT 10;

-- Check sync statistics
SELECT
  sync_type,
  status,
  COUNT(*) as count,
  SUM(conversations_synced) as total_conversations,
  SUM(messages_synced) as total_messages
FROM intercom_sync_logs
GROUP BY sync_type, status;
```

## Webhook Support (Future)

The schema includes tables for webhook event processing, enabling real-time updates in future versions.

## Troubleshooting

### Common Issues

1. **Authentication Error**
   - Verify your Intercom token is correct
   - Check token permissions (needs read access)
   - Ensure Supabase service role key is used (not anon key)

2. **Rate Limiting**
   - Reduce `--max-workers` parameter
   - Decrease `--batch-size`
   - Tool will automatically handle but may be slow

3. **Memory Issues**
   - Reduce batch size
   - Process date ranges separately
   - Use incremental sync more frequently

4. **Missing Data**
   - Check conversation part limit (500 max per conversation)
   - Verify date ranges
   - Check error logs in sync_logs table

### Debug Mode

Enable detailed logging:

```python
# In your code
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Security

- Never commit `.env` file with credentials
- Use environment variables for all secrets
- Enable RLS policies in Supabase for production
- Regularly rotate API tokens
- Monitor access logs

## Limitations

- Maximum 500 conversation parts per conversation (Intercom API limit)
- Historical data limited to 2 years
- Rate limit of 500 requests/minute
- Bulk export via UI not available (must use API)

## Support

For issues or questions:
1. Check sync logs for error details
2. Review Intercom API documentation
3. Verify Supabase connection and permissions
4. Check environment variables are set correctly

## License

MIT License - See LICENSE file for details