import os


def notification_status():
    return {
        "sendgridConfigured": bool(os.getenv("SENDGRID_API_KEY")),
        "twilioConfigured": bool(os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN")),
    }


def queue_campaign_delivery(campaign):
    return {
        "campaignId": campaign.id,
        "status": "queued" if any(notification_status().values()) else "stored-only",
        "message": "Provider hooks are ready for SendGrid and Twilio when credentials are configured.",
    }
