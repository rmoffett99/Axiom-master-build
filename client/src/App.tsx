import VeralogixSnapshot from "./components/VeralogixSnapshot";

... // other imports

function OrgRoutes() {
    return (
        <Switch>
            ... // other routes
            <Route path="/org/:orgSlug/veralogix" component={VeralogixSnapshot} />
            ... // other routes
        </Switch>
    );
}

// rest of the component code remains the same
