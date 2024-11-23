
# Discord Economy Bot Kickstart

This is a Discord bot that features an economy system, item store, trade functionality, and various commands for interacting with your profile, claiming daily rewards, checking the leaderboard, and more. 

This project is meant to kickstart your economy bot.
Please remember to link back to me, notjunar#0. 

## Features

- **Profile Command**: View your coins and other profile details.
- **Daily Command**: Claim daily coins (cooldown period of 24 hours).
- **Leaderboard Command**: View the top 10 users based on coins.
- **Inventory Command**: View your items in your inventory.
- **Store Command**: View the available items in the store.
- **Buy Command**: Purchase items from the store using your coins.
- **Trade Command**: Trade coins or items with other users.
- **Confirm Trade Command**: Confirm a trade transaction with another user.
- **Reject Trade Command**: Reject a trade transaction.
- **Help Command**: Display a list of available commands.

## Setup

### Prerequisites

- Node.js (v16 or higher)
- Discord bot token
- SQLite (or another supported database like MySQL/PostgreSQL if configured)

### Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/NotJunar/MagicalOrbs.git
   cd MagicalOrbs
   ```

2. Install the required dependencies:

   ```bash
   npm install
   ```

3. Replace YOUR_TOKEN_SIR at the end of line of `index.js` with your Discord bot token:

   ```
   client.login('YOUR_TOKEN_SIR');   
   ```

4. (Optional) Modify `index.js` if you plan to use MySQL or Mongodb.

5. Start the bot:

   ```bash
   node index.js
   ```

## Commands

Here is a list of all available commands:

### `/profile`

Displays your profile, including your coins and other details.

### `/daily`

Claims your daily reward (100 coins) if the cooldown has passed (24-hour period).

### `/leaderboard`

Displays the top 10 users based on their coins.

### `/inventory`

Displays your current items in your inventory.

### `/store`

Shows the available items for sale in the store.

### `/buy <item>`

Purchases an item from the store using your coins.

### `/trade <user> <coins> <item>`

Propose a trade with another user. You can offer coins and/or items for trade.



## Database Schema

The bot uses SQLite (or another relational database, depending on your setup) to store data. The following tables are used:

- **Users**: Stores user data such as userId, coins, and lastDaily claim time.
- **Items**: Stores available items for sale, including item name, description, price, and quantity.
- **Transactions**: Logs all transactions (earn/spend) involving coins and items.
- **UserItems**: Many-to-many relationship between users and items (for inventory management).

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature-name`).
5. Create a new Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```

### Customization

- **Discord Bot Token**: Replace `YOUR_TOKEN_SIR` in the `index.js` file with your actual bot token from the [Discord Developer Portal](https://discord.com/developers/applications).
  
- **Database Configuration**: If you are using a database other than SQLite, update the `sequelize` configuration in the `index.js` file to match your database credentials.

