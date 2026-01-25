# Task Queue Processing

## Overview

Task Queue Processing enables automated, scheduled execution of tasks through GitHub Actions workflows. This system allows tasks to be queued and processed at regular intervals without manual intervention.

## How It Works

### 1. Task Queue File

Tasks are stored in `task-queue.txt` at the repository root:

```
task1: description
task2: description
task3: description
```

Each line represents one task to be processed.

### 2. Scheduled Workflow

The `.github/workflows/scheduled-build.yml` workflow runs automatically:

- **Schedule**: Every 6 hours via cron (`0 */6 * * *`)
- **Manual Trigger**: Can also be triggered via `workflow_dispatch`
- **Trigger**: Processes when `task-queue.txt` has content

### 3. Processing Flow

```
┌─────────────────────┐
│  Scheduled Trigger  │
│   (every 6 hours)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Check task-queue.txt│
│   for pending tasks │
└──────────┬──────────┘
           │
           ▼
    ┌──────┴──────┐
    │ Tasks found?│
    └──────┬──────┘
           │ Yes
           ▼
┌─────────────────────┐
│  Run build-agent.yml│
│  workflow with task │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Execute task via  │
│   queue-task.sh     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Remove task from   │
│    queue file       │
└─────────────────────┘
```

### 4. Queue Management Script

The `queue-task.sh` script handles task operations:

```bash
# Add a task
./queue-task.sh add "Deploy to staging"

# Process next task
./queue-task.sh process

# List pending tasks
./queue-task.sh list

# Clear all tasks
./queue-task.sh clear
```

## Integration with Build System

### Automated Builds

When code changes are detected during scheduled runs:

1. **Trigger Detection**: Workflow checks for file changes or queue entries
2. **Build Execution**: Auto-build system compiles and validates code
3. **Test Execution**: Automated tests run against changes
4. **Notification**: Results posted to PR or issues

### Build Agent Workflow

The `build-agent.yml` workflow:

- Checks out code
- Sets up Node.js environment
- Installs dependencies
- Processes queued tasks
- Runs builds and tests
- Updates task queue status

## Configuration

### Schedule Customization

Edit `.github/workflows/scheduled-build.yml`:

```yaml
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:        # Manual trigger
```

Common cron patterns:
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight
- `0 */1 * * *` - Every hour
- `0 9,17 * * 1-5` - 9 AM and 5 PM on weekdays

### Task Priority

Tasks are processed FIFO (First In, First Out). For priority handling:

1. Clear non-urgent tasks: `./queue-task.sh clear`
2. Add urgent task: `./queue-task.sh add "urgent-task"`
3. Re-add other tasks

## Use Cases

### Continuous Integration

```bash
# Queue automated tests after merge
./queue-task.sh add "Run integration tests for PR #123"
```

### Scheduled Deployments

```bash
# Queue deployment tasks
./queue-task.sh add "Deploy to staging environment"
./queue-task.sh add "Deploy to production after approval"
```

### Maintenance Tasks

```bash
# Queue cleanup or optimization
./queue-task.sh add "Clean old artifacts"
./queue-task.sh add "Update dependencies"
```

## Monitoring

### Check Queue Status

```bash
# View pending tasks
cat task-queue.txt

# Check workflow runs
gh run list --workflow=scheduled-build.yml
```

### Workflow Logs

View execution logs in GitHub Actions:
1. Navigate to Actions tab
2. Select "Scheduled Build" workflow
3. View run details and logs

## Limitations

- **Serial Processing**: Tasks execute one at a time
- **No Retry Logic**: Failed tasks must be manually re-queued
- **GitHub Actions Limits**: Subject to runner availability and timeout limits (default: 6 hours max)
- **Queue Conflicts**: Concurrent modifications to `task-queue.txt` require conflict resolution

## Best Practices

1. **Clear Task Descriptions**: Use descriptive task names
2. **Monitor Regularly**: Check workflow runs for failures
3. **Limit Queue Size**: Keep queue manageable (< 10 tasks)
4. **Use Manual Triggers**: For urgent processing, use `workflow_dispatch`
5. **Version Control**: Task queue is version-controlled; review changes

## Troubleshooting

### Tasks Not Processing

Check:
- Workflow is enabled in repository settings
- `task-queue.txt` contains tasks
- Workflow schedule is active
- No workflow errors in Actions tab

### Failed Task Execution

1. View workflow logs
2. Check error messages
3. Fix underlying issue
4. Re-queue task: `./queue-task.sh add "retry: task-name"`

### Queue File Conflicts

If multiple processes modify the queue:
```bash
git pull --rebase
./queue-task.sh list  # Verify queue state
```

## Related Documentation

- [Auto-Build System](Auto-Build-System.md) - Automated build process
- [GitHub Actions Workflows](GitHub-Actions-Workflows.md) - Workflow configuration
- [Task Queue Management](Task-Queue-Management.md) - Queue API and management
- [Monitoring and Logging](Monitoring-And-Logging.md) - Tracking execution

## Examples

### Example Workflow Trigger

```yaml
name: Scheduled Build
on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

jobs:
  process-queue:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check Queue
        run: |
          if [ -s task-queue.txt ]; then
            echo "Tasks found, processing..."
            ./queue-task.sh process
          fi
```

### Example Task Processing

```bash
#!/bin/bash
# queue-task.sh process command

if [ -f task-queue.txt ] && [ -s task-queue.txt ]; then
  TASK=$(head -n 1 task-queue.txt)
  echo "Processing: $TASK"
  
  # Execute task logic here
  # ...
  
  # Remove from queue
  tail -n +2 task-queue.txt > task-queue.tmp
  mv task-queue.tmp task-queue.txt
fi
```
