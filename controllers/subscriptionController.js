const pool = require("../config/db");

// ================= GET CURRENT SUBSCRIPTION =================
const getCurrentSubscription = async (req, res) => {
  try {
    const userType = req.user.role.toLowerCase();
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT *
      FROM subscriptions
      WHERE user_type = $1
      AND user_id = $2
      `,
      [userType, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    return res.status(200).json({
      success: true,
      subscription: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ================= UPGRADE SUBSCRIPTION =================
const upgradeSubscription = async (req, res) => {
  try {

    const { plan } = req.body;

    const userType = req.user.role.toLowerCase();
    const userId = req.user.id;

    if (!["MONTHLY", "YEARLY"].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan.",
      });
    }

    const amount =
      plan === "MONTHLY" ? 499 : 4999;

    const expiryDate =
      plan === "MONTHLY"
        ? "NOW() + INTERVAL '30 days'"
        : "NOW() + INTERVAL '365 days'";

    await pool.query(
      `
      UPDATE subscriptions
      SET
        plan = $1,
        billing_cycle = $2,
        amount = $3,
        payment_status = 'PAID',
        uploads_limit = -1,
        expires_at = ${expiryDate}
      WHERE
        user_type = $4
        AND user_id = $5
      `,
      [
        plan,
        plan,
        amount,
        userType,
        userId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: `${plan} subscription activated.`,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getCurrentSubscription,
  upgradeSubscription,
};