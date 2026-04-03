import { useEffect, useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigation, useSubmit } from "react-router";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Divider,
  Badge,
  ProgressBar,
  ColorPicker,
  FormLayout,
  Select,
  Grid,
  Icon,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { merchant } from "../db/schema";
import { eq } from "drizzle-orm";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { HeadersFunction } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let currentMerchant = await db.query.merchant.findFirst({
    where: eq(merchant.shopDomain, shop),
  });

  if (!currentMerchant) {
    // If not exists, insert a default one for this demo/setup phase
    const [inserted] = await db.insert(merchant).values({
      shopDomain: shop,
      accessToken: session.accessToken || "",
      plan: "free",
      isActive: true,
      updatedAt: new Date()
    }).returning();
    currentMerchant = inserted;
  }

  // Mocked stats for the design prototype
  return { 
    merchant: currentMerchant, 
    stats: {
      usedGenerations: 12,
      totalGenerations: 50,
      daysLeftInTrial: 5
    }
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Action to save widget configuration settings (mocked for now)
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  // Here we would extract the settings and save them to the DB.
  return { success: true };
};

export default function Index() {
  const { merchant, stats } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const shopify = useAppBridge();
  
  const isSaving = navigation.state === "submitting";

  // Widget settings state
  const [btnColor, setBtnColor] = useState({
    hue: 120,
    brightness: 1,
    saturation: 1,
  });
  const [position, setPosition] = useState("bottom-right");
  const [isWidgetEnabled, setIsWidgetEnabled] = useState(merchant.isActive);

  const handleSaveSettings = useCallback(() => {
    const formData = new FormData();
    formData.append("btnColorHue", btnColor.hue.toString());
    formData.append("position", position);
    formData.append("isEnabled", isWidgetEnabled.toString());
    submit(formData, { method: "post" });
    shopify.toast.show("Settings saved successfully");
  }, [btnColor, position, isWidgetEnabled, submit, shopify]);

  const toggleWidget = useCallback(() => setIsWidgetEnabled((v) => !v), []);

  const progressPercentage = (stats.usedGenerations / stats.totalGenerations) * 100;

  return (
    <Page>
      <TitleBar title="Dashboard" />
      <BlockStack gap="500">
        <Layout>
          {/* Welcome & Quota Section */}
          <Layout.Section>
            <BlockStack gap="400">
              <Card roundedAbove="sm">
                <Box paddingBlockEnd="400">
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingXl" as="h2">
                        Welcome to Planicle Try-On! 🎉
                      </Text>
                      {isWidgetEnabled ? (
                        <Badge tone="success">Active on storefront</Badge>
                      ) : (
                        <Badge tone="critical">Disabled on storefront</Badge>
                      )}
                    </InlineStack>
                    <Text variant="bodyLg" as="p" tone="subdued">
                      Your virtual try-on widget is ready to boost your conversions. Customize the appearance below or check your latest generation stats.
                    </Text>
                    <Box paddingBlockStart="200">
                      <Button variant="primary" onClick={toggleWidget}>
                        {isWidgetEnabled ? "Disable Widget" : "Enable Widget"}
                      </Button>
                    </Box>
                  </BlockStack>
                </Box>
              </Card>

              <Grid>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                  <Card roundedAbove="sm">
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h3">
                          Monthly Quota
                        </Text>
                        <Badge tone={merchant.plan === "free" ? "attention" : "success"}>
                          {`${merchant.plan.charAt(0).toUpperCase() + merchant.plan.slice(1)} Plan`}
                        </Badge>
                      </InlineStack>
                      <Divider />
                      <BlockStack gap="100">
                        <Text variant="bodyMd" as="p">
                          <Text fontWeight="bold" as="span">{stats.usedGenerations}</Text> of {stats.totalGenerations} generations used
                        </Text>
                        <ProgressBar progress={progressPercentage} tone="primary" />
                        {merchant.plan === "free" && (
                          <Box paddingBlockStart="200">
                            <Button variant="primary" fullWidth>Upgrade Plan</Button>
                          </Box>
                        )}
                      </BlockStack>
                    </BlockStack>
                  </Card>
                </Grid.Cell>
                
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                  <Card roundedAbove="sm">
                    <BlockStack gap="200">
                      <Text variant="headingMd" as="h3">
                         Next Steps
                      </Text>
                      <Divider />
                      <BlockStack gap="200">
                        <InlineStack wrap={false} gap="200" blockAlign="center">
                          <Badge tone="success">Done</Badge>
                          <Text as="span">Install application</Text>
                        </InlineStack>
                        <InlineStack wrap={false} gap="200" blockAlign="center">
                          {isWidgetEnabled ? <Badge tone="success">Done</Badge> : <Badge tone="info">Pending</Badge>}
                          <Text as="span">Enable Try-On widget</Text>
                        </InlineStack>
                        <InlineStack wrap={false} gap="200" blockAlign="center">
                          <Badge tone="info">Pending</Badge>
                          <Text as="span">Explore premium plans</Text>
                        </InlineStack>
                      </BlockStack>
                    </BlockStack>
                  </Card>
                </Grid.Cell>
              </Grid>
            </BlockStack>
          </Layout.Section>

          {/* Settings Section */}
          <Layout.Section variant="oneThird">
            <Card roundedAbove="sm">
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  Widget Customization
                </Text>
                <FormLayout>
                  <Select
                    label="Widget Position"
                    options={[
                      { label: "Bottom Right", value: "bottom-right" },
                      { label: "Bottom Left", value: "bottom-left" },
                      { label: "Middle Left", value: "middle-left" },
                    ]}
                    onChange={setPosition}
                    value={position}
                  />
                  <Box>
                    <Text as="p" variant="bodyMd">Primary Button Color</Text>
                    <Box paddingBlockStart="200">
                      <ColorPicker onChange={setBtnColor} color={btnColor} />
                    </Box>
                  </Box>
                </FormLayout>
                <Divider />
                <Button 
                  onClick={handleSaveSettings} 
                  variant="primary" 
                  loading={isSaving}
                >
                  Save settings
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
