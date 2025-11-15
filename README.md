# Creek Wallet Actions

A Node.js CLI tool to automate interactions with the Creek Finance protocol on the Sui Testnet. This script allows you to manage multiple wallets and perform a sequence of actions automatically from an interactive menu.

## Features

- **Multi-Wallet Support:** Loads any number of wallets from a single `.env` file.
- **Interactive CLI Menu:** A clean, easy-to-use menu to select individual actions.
- **Dynamic Amount Selection:** For all financial actions (stake, borrow, etc.), you can choose:
  - Default amount (hard-coded)
  - Custom amount
  - Percentage of your balance (100%, 50%, 20%)
  - Random percentage of your balance (20-100%)
- **Interactive "RUN ALL":** A powerful mode that lets you:
  1.  Select _which_ actions you want to run using checkboxes.
  2.  Configure the amount (default, custom, random, etc.) for _each_ selected action.
  3.  Run the entire sequence across all your wallets.
- **Polished Output:** Clear loading spinners, success, and error messages.
- **Robust Error Handling:** If one wallet fails a transaction, the script logs the error and continues with the next wallet, ensuring it doesn't stop mid-batch.

## Prerequisites

- [Node.js](https://nodejs.org/en/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (which comes with Node.js)

## Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/mesamirh/Creek-Wallet-Actions.git
    ```

2.  **Navigate to the project directory:**

    ```bash
    cd Creek-Wallet-Actions
    ```

3.  **Install the dependencies:**
    ```bash
    npm install
    ```

## Configuration

This is the most important step. The script loads all wallet private keys from a `.env` file.

1.  Create a new file named `.env` in the root of the project directory.

2.  Open the `.env` file and add your private keys in the following format:

    ```env
    PRIVATE_KEYS=suiprivkey1...,suiprivkey1...,suiprivkey1...
    ```

    **Important:**

    - Keys must be in the **Bech32** format (starting with `suiprivkey1...`).
    - If you have multiple keys, separate them with a single comma (`,`) and no spaces.

## Usage

To run the script, simply use the `start` command:

```bash
npm start
```
