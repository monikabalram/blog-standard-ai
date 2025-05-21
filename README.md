# Next JS & Open AI / GPT: Next-generation Next JS & AI apps

Payment gateway link - https://stripe.com/en-ca

Auth0 for login - https://auth0.com/

Deployment - https://cloud.digitalocean.com/apps/835ab845-dad8-4189-af55-54f089da1be2/settings?i=7cf005



Stripe payment expires every 90 days so use below command to re authenticate
> stripe login
> press enter
> it will redirect to stripe url - click allow access
>

To listen to stripe webhooks use below command
> stripe listen --forward-to localhost:3000/api/webhooks/stripe
# blog-standard-ai
