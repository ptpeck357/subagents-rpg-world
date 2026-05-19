# Secret Scanner Skill

## Trigger

Auto-invoke whenever any file is created or modified.

## Steps

1. Check for hardcoded API keys, tokens, or secrets
2. Check for credentials in connection strings
3. Verify .env values are not hardcoded inline
4. Flag any NEXT*PUBLIC* variables containing sensitive data

## Rule

If anything found, stop and report immediately before continuing.
